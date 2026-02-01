module.exports = {
    id: "trr-456",
    type: "game",
    name: "Tomb Raider Remastered IV-V",
    executable: "tomb456.exe",
    modules: {
        "tomb4.dll": { id: "tr4", name: "Tomb Raider IV: The Last Revelation" },
        "tomb5.dll": { id: "tr5", name: "Tomb Raider V: Chronicles" }
    },
    constants: {
        ROOM_SIZE: 0x130,
        ENTITY_SIZE: 0x24c8,
        ENTITY_BONES_SIZE: 0x2f0,
        ENTITY_POS_SIZE: 0x10,
        ENTITY_POS_NO_ROT_SIZE: 0xc,
        LARA_HAIR_SIZE: 0x6ac,
        LARA_BASIC_SIZE: 0x1e,
        LARA_SHADOW_SIZE: 0xc,
        LARA_APPEARANCE_SIZE: 0x18,
        LARA_GUNFLAG_SIZE: 0x2,
        LARA_OUTFIT_SIZE: 0x38,
        LARA_FACE_SIZE: 0x14,
        ENTITY_X: 0x60,
        ENTITY_Y: 0x64,
        ENTITY_Z: 0x68,
        ENTITY_LAST_X: 0x1840,
        ENTITY_ROOM: 0x1c,
        ENTITY_HEALTH: 0x26,
        ENTITY_BONES: 0x1e98,
        ENTITY_LAST_BONES: 0x1868,
        ENTITY_XZ_SPEED: 0x22,
        ENTITY_Y_SPEED: 0x24,
        ENTITY_CURRENT_STATE: 0x12,
        ENTITY_TARGET_STATE: 0x14,
        ENTITY_QUEUED_STATE: 0x16,
        ENTITY_ANIM_ID: 0x18,
        ENTITY_ANIM_FRAME: 0x1a,
        ENTITY_FLAGS: 0x2c,
    },
    patches: {
        "patch1": {
            name: "Patch 1",
            patch: "5164bc98143a92299107b2fc0d030464bac7d2ec8fa5954f16a71e0e283632dc",
            memory: {
                "tomb456.exe": require("./patches/patch1/tomb456.exe"),
                "tomb4.dll": require("./patches/patch1/tomb4.dll"),
                "tomb5.dll": require("./patches/patch1/tomb5.dll"),
            }
        },
        "patch2": {
            name: "Patch 2",
            patch: "0e45e221e3d2413e981b0eb1172fe73ef82ce1ac3d36f23a6aea9c1bfe5d11e6",
            memory: {
                "tomb456.exe": require("./patches/patch2/tomb456.exe"),
                "tomb4.dll": require("./patches/patch2/tomb4.dll"),
                "tomb5.dll": require("./patches/patch2/tomb5.dll"),
            }
        },
        "patch2-hotfix1": {
            name: "Patch 2 Hotfix 1",
            patch: "cf0f46623fd0d735ca19d691c7b84877529ab838a3065dfaa7d708c76ec359c0",
            memory: {
                "tomb456.exe": require("./patches/patch2-hotfix1/tomb456.exe"),
                "tomb4.dll": require("./patches/patch2-hotfix1/tomb4.dll"),
                "tomb5.dll": require("./patches/patch2-hotfix1/tomb5.dll"),
            }
        }
    },
    defaultPatch: "patch2-hotfix1"
};
