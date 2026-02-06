# Variable: VehicleId

## Description
The entity ID of the vehicle Lara is currently using.

## Notes
- `-1` when Lara is not in a vehicle
- TR2 vehicles include the speedboat and skidoo

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `-1`  | Not in a vehicle               |
| `>=0` | Entity ID of active vehicle    |

## Usage
### Calling from mod code
```javascript
const vehicleId = game.readVar(game.module, 'VehicleId');

if (vehicleId !== -1) {
    // Lara is in a vehicle
}
```
