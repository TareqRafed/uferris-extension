//! Blinks the blue LED on the Seeed Xiao RP2040.
//!
//! Build:  `fork build -c rp2040 -- --release`
//! Flash:  `probe-rs flash --chip RP2040 target/thumbv6m-none-eabi/release/hello-world`

#![no_std]
#![no_main]

use cortex_m_rt::entry;
use embedded_hal::digital::OutputPin;
use panic_halt as _;
use rp2040_hal::{self as hal, clocks::Clock, pac};

/// Boot-loader required by all RP2040 projects.
#[link_section = ".boot2"]
#[no_mangle]
#[used]
pub static BOOT2_FIRMWARE: [u8; 256] = rp2040_boot2::BOOT_LOADER_GENERIC_03H;

/// Xiao RP2040 uses a 12 MHz crystal.
const XOSC_CRYSTAL_FREQ: u32 = 12_000_000;

#[entry]
fn main() -> ! {
    let mut pac = pac::Peripherals::take().unwrap();
    let core = pac::CorePeripherals::take().unwrap();

    let mut watchdog = hal::Watchdog::new(pac.WATCHDOG);

    let clocks = hal::clocks::init_clocks_and_plls(
        XOSC_CRYSTAL_FREQ,
        pac.XOSC,
        pac.CLOCKS,
        pac.PLL_SYS,
        pac.PLL_USB,
        &mut pac.RESETS,
        &mut watchdog,
    )
    .ok()
    .unwrap();

    let mut delay = cortex_m::delay::Delay::new(core.SYST, clocks.system_clock.freq().to_Hz());

    let sio = hal::Sio::new(pac.SIO);
    let pins = hal::gpio::Pins::new(
        pac.IO_BANK0,
        pac.PADS_BANK0,
        sio.gpio_bank0,
        &mut pac.RESETS,
    );

    // Xiao RP2040: blue LED is GPIO 25, active low.
    let mut led = pins.gpio25.into_push_pull_output();

    loop {
        led.set_low().unwrap();  // on
        delay.delay_ms(500);
        led.set_high().unwrap(); // off
        delay.delay_ms(500);
    }
}
