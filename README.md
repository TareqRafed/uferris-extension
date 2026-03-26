# uFerris VS Code Extension

VS Code extension for the **uFerris** learning board — a Rust-first embedded development kit built on Seeed Studio Xiao carrier boards.


More about the board can be found at [`uferris-bsp`](https://github.com/uFerris-rs/uferris-bsp).


## What is the uFerris VS Code Extension?

The uFerris extension is designed to automate your journey with the uFerris board without the need to clutter your machine with different toolchains from different vendors or write your starting templates from scratch.

The extension is built to support Rust projects only and will not work with other tools such as Arduino, C, or similar frameworks.

Under the hood, uFerris uses [`fork`](https://github.com/TareqRafed/fork/) and `probe-rs`. `fork` manages builds so you do not have to install any build tools locally — the build tools run in an isolated container that is deletable at any time. `probe-rs` implements many flashing protocols, which also means you do not need extra toolchains to get started.

## Getting Started

### Prerequisites

- Either Docker or Podman.
- `probe-rs` — the extension will offer to install it via `cargo install probe-rs-tools` if missing.

### Install

Install the extension from the VS Code Marketplace. 

TBD

## Commands

Open the Command Palette (`Ctrl+Shift+P`) and search for **uFerris**:

- **Build** — pick a board, then compiles your firmware using [`fork`](https://github.com/TareqRafed/fork/). Output can be seen in the terminal.
- **Flash** — pick a board, then flashes the compiled binary to your board via [`probe-rs`](https://probe.rs). If `probe-rs` is missing but `cargo` is available, the extension offers to install it automatically.
- **Create Example** — pick a board, pick an example, and a complete ready-to-build project is scaffolded into your workspace.
- **Select Board** — change the saved board without triggering a build or flash.

## Contributions

Feel free to open a PR to add a new example for a specific board. Examples live in `examples/{board}/{example-name}/` and must be a complete Rust project.

## License

MIT
