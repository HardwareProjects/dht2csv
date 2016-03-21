declare module "node-dht-sensor" {
  export function initialize(sensorType: number, GPIOPort: number): boolean;
  export function read(): ReadResult;
  export function readSpec(sensorType: number, GPIOPort: number): ReadResult;

  export interface ReadResult {
    humidity: number;
    temperature: number;
    isValid: boolean;
    errors: number;
  }
}