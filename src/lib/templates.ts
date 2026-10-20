// Tested starting points. Each one compiles with solc 0.8.28 and OpenZeppelin 5, for any
// values its settings accept. Settings are baked into the source, so no AI is needed.

export type Field = {
  key: string;
  label: string;
  kind: "text" | "int" | "percent" | "eth";
  hint?: string;
  max?: number;
};
export type Values = Record<string, string>;
export type Template = {
  id: string;
  name: string;
  blurb: string;
  brief: string;
  fields: Field[];
  defaults: Values;
  build: (v: Values) => string;
  /** Plain-English facts for the notes and the Launch Kit. */
  facts: (v: Values) => string[];
};

// Make user input safe to drop into Solidity source.
const str = (s: string, fallback: string) => JSON.stringify((s || fallback).replace(/[^\p{L}\p{N} ._\-$!&']/gu, "").slice(0, 40) || fallback);
const sym = (s: string, fallback: string) => JSON.stringify((s || fallback).replace(/[^A-Za-z0-9$]/g, "").toUpperCase().slice(0, 11) || fallback);
const int = (s: string, fallback: number, max = 1e15) => {
  const n = Math.floor(Number(String(s).replace(/[,_\s]/g, "")));
  return String(Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback).replace(/\B(?=(\d{3})+(?!\d))/g, "_");
};
/** Percent with up to two decimals, as basis points. */
const bps = (s: string, fallback: number, maxBps: number) => {
  const n = Math.round(Number(s) * 100);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, maxBps) : fallback;
};
/** An ETH amount as a Solidity literal, e.g. "0.001 ether". */
const eth = (s: string, fallback: string) => (/^\d{1,6}(\.\d{1,18})?$/.test(s.trim()) ? `${s.trim()} ether` : `${fallback} ether`);
const plain = (n: string) => n.replace(/_/g, ",");

export const TEMPLATES: Template[] = [
  {
    id: "token",
    name: "Simple token",
    blurb: "Fixed supply, minted once to you. No owner tricks.",
    brief: "A simple ERC-20 token with a fixed supply, all minted to me at deploy. No owner, no mint, no tax.",
    fields: [
      { key: "name", label: "Token name", kind: "text" },
      { key: "symbol", label: "Symbol", kind: "text", hint: "e.g. MOON" },
      { key: "supply", label: "Total supply", kind: "int" },
    ],
    defaults: { name: "My Token", symbol: "MYT", supply: "1000000000" },
    build: (v) => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ${JSON.parse(str(v.name, "My Token"))}
/// @notice The whole supply is created once, at deploy, and sent to the deployer.
///         Nobody can ever mint more, pause trading or charge a tax.
contract Token is ERC20 {
    constructor() ERC20(${str(v.name, "My Token")}, ${sym(v.symbol, "MYT")}) {
        _mint(msg.sender, ${int(v.supply, 1_000_000_000)} ether);
    }
}
`,
    facts: (v) => [
      `${plain(int(v.supply, 1_000_000_000))} tokens, all minted once to the deployer`,
      "No owner, no mint, no tax, no blacklist",
    ],
  },
  {
    id: "tax-token",
    name: "Token with a tax",
    blurb: "A small fee on every transfer goes to a wallet you pick. Hard-capped.",
    brief: "An ERC-20 token with a fee on transfers that goes to a treasury wallet, with a hard maximum.",
    fields: [
      { key: "name", label: "Token name", kind: "text" },
      { key: "symbol", label: "Symbol", kind: "text" },
      { key: "supply", label: "Total supply", kind: "int" },
      { key: "fee", label: "Fee on transfers (%)", kind: "percent", max: 5 },
      { key: "cap", label: "Fee can never go above (%)", kind: "percent", max: 10 },
    ],
    defaults: { name: "My Token", symbol: "MYT", supply: "1000000000", fee: "2", cap: "5" },
    build: (v) => {
      const cap = bps(v.cap, 500, 1000);
      const fee = Math.min(bps(v.fee, 200, 1000), cap);
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${JSON.parse(str(v.name, "My Token"))}
/// @notice A ${fee / 100}% fee on transfers goes to the treasury. The owner can lower it
///         or raise it, but never above ${cap / 100}%.
contract TaxToken is ERC20, Ownable {
    uint256 public constant MAX_FEE_BPS = ${cap}; // ${cap / 100}%, hard limit
    uint256 public feeBps = ${fee}; // ${fee / 100}%
    address public treasury;
    mapping(address => bool) public feeExempt;

    error FeeTooHigh();

    /// @param treasury_ The wallet that receives the fee.
    constructor(address treasury_) ERC20(${str(v.name, "My Token")}, ${sym(v.symbol, "MYT")}) Ownable(msg.sender) {
        treasury = treasury_;
        feeExempt[msg.sender] = true;
        feeExempt[treasury_] = true;
        _mint(msg.sender, ${int(v.supply, 1_000_000_000)} ether);
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || feeExempt[from] || feeExempt[to] || feeBps == 0) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = (value * feeBps) / 10_000;
        super._update(from, treasury, fee);
        super._update(from, to, value - fee);
    }
}
`;
    },
    facts: (v) => {
      const cap = bps(v.cap, 500, 1000);
      const fee = Math.min(bps(v.fee, 200, 1000), cap);
      return [`${plain(int(v.supply, 1_000_000_000))} tokens minted to the deployer`, `${fee / 100}% fee on transfers to a treasury wallet`, `The fee can never go above ${cap / 100}%`];
    },
  },
  {
    id: "vault",
    name: "Community vault",
    blurb: "Members deposit ETH and withdraw their own balance any time.",
    brief: "A vault where anyone can deposit ETH and withdraw only their own balance at any time.",
    fields: [],
    defaults: {},
    build: () => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title A shared vault where everyone controls their own balance
/// @notice No owner. Nobody can touch your deposit but you.
contract CommunityVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    error NothingToWithdraw();
    error TransferFailed();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0 || amount > balances[msg.sender]) revert NothingToWithdraw();
        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }
}
`,
    facts: () => ["Anyone can deposit ETH", "Each member can only withdraw their own balance", "No owner, no admin keys"],
  },
  {
    id: "airdrop",
    name: "Airdrop",
    blurb: "Send one token to many wallets in a single transaction.",
    brief: "A contract that sends an ERC-20 token from my wallet to a list of addresses with amounts, in one transaction.",
    fields: [],
    defaults: {},
    build: () => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Batch token sender
/// @notice Approve this contract for your token first, then call airdrop with your list.
contract Airdrop {
    using SafeERC20 for IERC20;

    error LengthMismatch();

    function airdrop(IERC20 token, address[] calldata recipients, uint256[] calldata amounts) external {
        if (recipients.length != amounts.length) revert LengthMismatch();
        for (uint256 i; i < recipients.length; ++i) {
            token.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
        }
    }
}
`,
    facts: () => ["Sends any token to many wallets in one transaction", "Tokens only move from the wallet that calls it"],
  },
  {
    id: "vesting",
    name: "Token vesting",
    blurb: "Lock tokens and release them gradually to one wallet.",
    brief: "A vesting contract that releases ERC-20 tokens to one beneficiary linearly after a cliff.",
    fields: [
      { key: "cliff", label: "Wait before anything unlocks (days)", kind: "int" },
      { key: "months", label: "Fully unlocked after (months)", kind: "int" },
    ],
    defaults: { cliff: "30", months: "12" },
    build: (v) => {
      const months = int(v.months, 12, 120).replace(/_/g, "");
      const cliff = Math.min(Number(int(v.cliff, 30, 3650).replace(/_/g, "")), Number(months) * 30);
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Linear vesting with a cliff
/// @notice Send tokens here after deploying. Nothing unlocks for ${cliff} days, then tokens
///         unlock evenly until month ${months}. Only the beneficiary receives them.
contract TokenVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64 public immutable start;
    uint64 public constant CLIFF = ${cliff} days;
    uint64 public constant DURATION = ${Number(months) * 30} days;
    uint256 public released;

    error NothingToRelease();

    /// @param token_ The token being vested.
    /// @param beneficiary_ The wallet that receives the unlocked tokens.
    constructor(IERC20 token_, address beneficiary_) {
        token = token_;
        beneficiary = beneficiary_;
        start = uint64(block.timestamp);
    }

    function vested() public view returns (uint256) {
        uint256 total = token.balanceOf(address(this)) + released;
        if (block.timestamp < start + CLIFF) return 0;
        if (block.timestamp >= start + DURATION) return total;
        return (total * (block.timestamp - start)) / DURATION;
    }

    function release() external {
        uint256 amount = vested() - released;
        if (amount == 0) revert NothingToRelease();
        released += amount;
        token.safeTransfer(beneficiary, amount);
    }
}
`;
    },
    facts: (v) => {
      const months = int(v.months, 12, 120).replace(/_/g, "");
      return [`Nothing unlocks for the first ${int(v.cliff, 30, 3650).replace(/_/g, "")} days`, `Tokens unlock evenly until month ${months}`, "Only the beneficiary can receive them"];
    },
  },
  {
    id: "nft",
    name: "NFT drop",
    blurb: "A capped NFT collection anyone can mint for a set price.",
    brief: "An NFT collection with a max supply and a public mint price; the owner can withdraw the mint money.",
    fields: [
      { key: "name", label: "Collection name", kind: "text" },
      { key: "symbol", label: "Symbol", kind: "text" },
      { key: "max", label: "Max supply", kind: "int" },
      { key: "price", label: "Mint price (ETH)", kind: "eth" },
    ],
    defaults: { name: "My Collection", symbol: "MYC", max: "1000", price: "0.001" },
    build: (v) => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${JSON.parse(str(v.name, "My Collection"))}
/// @notice Anyone can mint until ${plain(int(v.max, 1000, 1_000_000))} pieces exist. The owner can withdraw the mint money.
contract NftDrop is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY = ${int(v.max, 1000, 1_000_000)};
    uint256 public constant PRICE = ${eth(v.price, "0.001")};
    uint256 public totalMinted;
    string private baseUri;

    error SoldOut();
    error WrongPrice();
    error TransferFailed();

    /// @param baseUri_ Where the metadata lives, e.g. ipfs://.../
    constructor(string memory baseUri_) ERC721(${str(v.name, "My Collection")}, ${sym(v.symbol, "MYC")}) Ownable(msg.sender) {
        baseUri = baseUri_;
    }

    function mint() external payable {
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        if (msg.value != PRICE) revert WrongPrice();
        _safeMint(msg.sender, ++totalMinted);
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }
}
`,
    facts: (v) => [`${plain(int(v.max, 1000, 1_000_000))} pieces max`, `Public mint at ${eth(v.price, "0.001").replace(" ether", "")} ETH each`, "The owner can withdraw the mint money"],
  },
];

/** Launch copy written from a template's facts, for when the AI is off. */
export function offlineLaunchKit(project: string, t: Template, v: Values): string {
  const facts = t.facts(v);
  const name = project.trim() || "Our project";
  return [
    "TAGLINE",
    `${name}. Built on Robinhood Chain.`,
    "BIO",
    `${name} on Robinhood Chain. ${facts[0]}. Built with Parlo.`.slice(0, 160),
    "LAUNCH POST",
    `${name} is live on Robinhood Chain.\n\n${facts.map((f) => `› ${f}`).join("\n")}\n\nCA: [PASTE CA HERE]`,
    "THREAD",
    `What is ${name}?\n\n${facts.join(". ")}.`,
    "---",
    `The contract is simple on purpose. Read it yourself on the explorer before you do anything.`,
    "---",
    `Built in minutes with Parlo, the plain-English contract studio for Robinhood Chain.`,
  ].join("\n");
}
