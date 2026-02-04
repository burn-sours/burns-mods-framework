/** tomb4.dll - Patch 2 Hotfix 1 */
const patch2 = require("../patch2/tomb4.dll");

module.exports = {
    variables: patch2.variables,

    hooks: {
        RenderLara: { Address: "0x2f430", Params: ['pointer'], Return: 'void' },
        ApplySettings: { Address: "0xf35f0", Params: ['pointer', 'pointer'], Return: 'void' },
        LoadedLevel: { Address: "0x100600", Params: ['pointer'], Return: 'void' },
        InitializeLevelAI: { Address: "0x87e90", Params: ['int'], Return: 'void' },
        SoundEffect: { Address: "0xd43f0", Params: ['int', 'pointer', 'int'], Return: 'int' },
        ProcessGrenade: { Address: "0x56b40", Params: ['int16'], Return: 'void' },
        ProcessHarpoon: { Address: "0x582c0", Params: ['int16'], Return: 'void' },
        ProcessFreeaim: { Address: "0x15440", Params: ['pointer', 'pointer', 'int', 'int'], Return: 'void' },
        DetectHit: { Address: "0xa76f0", Params: ['pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'int'], Return: 'int' },
        RenderUI: { Address: "0xeddb0", Params: [], Return: 'void' },
        Clone: { Address: "0x120f20", Params: ['pointer', 'pointer', 'uint64'], Return: 'void' },
        RenderText: { Address: "0xedbf0", Params: ['int', 'int', 'int', 'pointer', 'int'], Return: 'pointer' },
        DrawSetup: { Address: "0xb2430", Params: ['int', 'pointer'], Return: 'void' },
        DrawRect: { Address: "0xb2f50", Params: ['float', 'float', 'float', 'float', 'uint64', 'uint64'], Return: 'void' },
        DrawQuad: { Address: "0xb2ea0", Params: ['int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'int'], Return: 'void' },
        RoomChange: { Address: "0x407c0", Params: ['int', 'int'], Return: 'void' },
        RenderEntity: { Address: "0x2fdb0", Params: ['pointer'], Return: 'void' },
        GetRelYawPitch: { Address: "0xd6560", Params: ['int', 'int', 'int', 'pointer'], Return: 'void' },
        GetLOS: { Address: "0x14e20", Params: ['pointer', 'pointer'], Return: 'int' },
        GetRangeH: { Address: "0x14a60", Params: ['pointer', 'pointer'], Return: 'int' },
        GetRangeV: { Address: "0x146a0", Params: ['pointer', 'pointer'], Return: 'int' },
        CheckAim: { Address: "0x5db80", Params: ['pointer'], Return: 'void' },
        DealDmg: { Address: "0x9b1b0", Params: ['pointer', 'int', 'int'], Return: 'void' },
        ModernGfx: { Address: "0x32250", Params: ['int', 'int', 'int', 'int', 'int', 'int', 'int'], Return: 'void' },
        GetEntityBox: { Address: "0xa3d20", Params: ['pointer'], Return: 'pointer' },
        RemoveEntity: { Address: "0x40140", Params: ['int'], Return: 'void' },
        AttachLaraHair: { Address: "0xefdf0", Params: ['int', 'int'], Return: 'void' },
        ResetLaraHair: { Address: "0xef5f0", Params: [], Return: 'void' },
    }
};
