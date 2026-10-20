/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // The compiler reads OpenZeppelin sources from disk at request time.
  outputFileTracingIncludes: { "/api/compile": ["./node_modules/@openzeppelin/contracts/**/*.sol"] },
  serverExternalPackages: ["solc"],
};

export default nextConfig;
