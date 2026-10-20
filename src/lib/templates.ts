// Tested starting points. Each one compiles with solc 0.8.28 and OpenZeppelin 5.
export type Template = { id: string; name: string; blurb: string; brief: string; source: string };

export const TEMPLATES: Template[] = [
  {
    id: "token",
    name: "Simple token",
    blurb: "Fixed supply, minted once to you. No owner tricks.",
    brief: "A simple ERC-20 token with a fixed supply of 1 billion, all minted to me at deploy. No owner, no mint, no tax.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title A fixed-supply token
/// @notice The whole supply is created once, at deploy, and sent to the deployer.
contract SimpleToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}
`,
  },
  {
    id: "tax-token",
    name: "Token with a tax",
    blurb: "A small fee on every transfer goes to a wallet you pick. Capped at 5%.",
    brief: "An ERC-20 token with a 2% fee on transfers that goes to a treasury wallet. The fee can never go above 5%.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title A token with a capped transfer fee
contract TaxToken is ERC20, Ownable {
    uint256 public constant MAX_FEE_BPS = 500; // 5%, hard limit
    uint256 public feeBps = 200; // 2%
    address public treasury;
    mapping(address => bool) public feeExempt;

    error FeeTooHigh();

    constructor(string memory name_, string memory symbol_, address treasury_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        treasury = treasury_;
        feeExempt[msg.sender] = true;
        feeExempt[treasury_] = true;
        _mint(msg.sender, 1_000_000_000 ether);
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
`,
  },
  {
    id: "vault",
    name: "Community vault",
    blurb: "Members deposit ETH and withdraw their own balance any time.",
    brief: "A vault where anyone can deposit ETH and withdraw only their own balance at any time.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title A shared vault where everyone controls their own balance
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
  },
  {
    id: "airdrop",
    name: "Airdrop",
    blurb: "Send one token to many wallets in a single transaction.",
    brief: "A contract that sends an ERC-20 token from my wallet to a list of addresses with amounts, in one transaction.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Batch token sender
/// @notice Approve this contract first, then call airdrop with your list.
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
  },
  {
    id: "vesting",
    name: "Token vesting",
    blurb: "Lock tokens and release them gradually to one wallet.",
    brief: "A vesting contract that releases ERC-20 tokens to one beneficiary linearly over 12 months after a 1 month cliff.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Linear vesting with a cliff
contract TokenVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64 public immutable start;
    uint64 public immutable cliff;
    uint64 public immutable duration;
    uint256 public released;

    error NothingToRelease();

    constructor(IERC20 token_, address beneficiary_) {
        token = token_;
        beneficiary = beneficiary_;
        start = uint64(block.timestamp);
        cliff = 30 days;
        duration = 365 days;
    }

    function vested() public view returns (uint256) {
        uint256 total = token.balanceOf(address(this)) + released;
        if (block.timestamp < start + cliff) return 0;
        if (block.timestamp >= start + duration) return total;
        return (total * (block.timestamp - start)) / duration;
    }

    function release() external {
        uint256 amount = vested() - released;
        if (amount == 0) revert NothingToRelease();
        released += amount;
        token.safeTransfer(beneficiary, amount);
    }
}
`,
  },
  {
    id: "nft",
    name: "NFT drop",
    blurb: "A capped NFT collection anyone can mint for a set price.",
    brief: "An NFT collection with a max supply of 1000, public mint at 0.001 ETH each, and the owner can withdraw the mint money.",
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title A capped public NFT mint
contract NftDrop is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant PRICE = 0.001 ether;
    uint256 public totalMinted;
    string private baseUri;

    error SoldOut();
    error WrongPrice();
    error TransferFailed();

    constructor(string memory name_, string memory symbol_, string memory baseUri_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
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
  },
];
