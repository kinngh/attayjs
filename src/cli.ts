#!/usr/bin/env bun
import { dev } from ".";

async function main() {
  const subcommand = process.argv[2];
  if (subcommand === "dev") {
    await dev();
  } else {
    console.log("Usage: attay dev");
  }
}

main();
