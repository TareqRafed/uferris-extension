export interface McuConfig {
  id: string;
  label: string;
  forkTarget: string;
  targetTriple: string;
  probeChip: string;
}

export const SUPPORTED_MCUS: readonly McuConfig[] = [
  {
    id: 'rp2040',
    label: 'Xiao RP2040',
    forkTarget: 'rp2040',
    targetTriple: 'thumbv6m-none-eabi',
    probeChip: 'RP2040',
  },
  {
    id: 'esp32c3',
    label: 'Xiao ESP32-C3',
    forkTarget: 'esp32c3',
    targetTriple: 'riscv32imc-unknown-none-elf',
    probeChip: 'esp32c3',
  },
];
