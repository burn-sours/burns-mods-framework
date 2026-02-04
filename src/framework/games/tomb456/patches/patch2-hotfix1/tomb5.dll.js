/** tomb5.dll - Patch 2 Hotfix 1 */
const patch2 = require("../patch2/tomb5.dll");

module.exports = {
    variables: patch2.variables,

    hooks: {
        RenderLara: { Address: "0x30830", Params: ['pointer'], Return: 'void' },
        ApplySettings: { Address: "0xf0c50", Params: ['pointer', 'pointer'], Return: 'void' },
        LoadedLevel: { Address: "0xfc370", Params: ['pointer'], Return: 'void' },
        InitializeLevelAI: { Address: "0x84d70", Params: ['int'], Return: 'void' },
        SoundEffect: { Address: "0xa43c0", Params: ['int', 'pointer', 'int'], Return: 'int' },
        ProcessFreeaim: { Address: "0x133a0", Params: ['pointer', 'pointer', 'int', 'int'], Return: 'void' },
        DetectHit: { Address: "0xa0150", Params: ['pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'int'], Return: 'int' },
        RenderUI: { Address: "0xe48e0", Params: [], Return: 'void' },
        Clone: { Address: "0x11cd40", Params: ['pointer', 'pointer', 'uint64'], Return: 'void' },
        RenderText: { Address: "0xe4720", Params: ['int', 'int', 'int', 'pointer', 'int'], Return: 'pointer' },
        DrawSetup: { Address: "0xa54c0", Params: ['int', 'pointer'], Return: 'void' },
        DrawRect: { Address: "0xa5fe0", Params: ['float', 'float', 'float', 'float', 'uint64', 'uint64'], Return: 'void' },
        DrawQuad: { Address: "0xa5f30", Params: ['int', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'int'], Return: 'void' },
        RoomChange: { Address: "0x46560", Params: ['int', 'int'], Return: 'void' },
        RenderEntity: { Address: "0x31680", Params: ['pointer'], Return: 'void' },
        GetRelYawPitch: { Address: "0xa1e60", Params: ['int', 'int', 'int', 'pointer'], Return: 'void' },
        GetLOS: { Address: "0x12d50", Params: ['pointer', 'pointer'], Return: 'int' },
        GetRangeH: { Address: "0x12990", Params: ['pointer', 'pointer'], Return: 'int' },
        GetRangeV: { Address: "0x125d0", Params: ['pointer', 'pointer'], Return: 'int' },
        CheckAim: { Address: "0x5beb0", Params: ['pointer'], Return: 'void' },
        DealDmg: { Address: "0x5c810", Params: ['pointer', 'int', 'int', 'int'], Return: 'void' },
        ModernGfx: { Address: "0x339b0", Params: ['int', 'int', 'int', 'int', 'int', 'int', 'int'], Return: 'void' },
        GetEntityBox: { Address: "0x9c710", Params: ['pointer'], Return: 'pointer' },
        RemoveEntity: { Address: "0x45fa0", Params: ['int'], Return: 'void' },
        AttachLaraHair: { Address: "0xedcc0", Params: ['int', 'int'], Return: 'void' },
        ResetLaraHair: { Address: "0xed4c0", Params: [], Return: 'void' },
    }
};
