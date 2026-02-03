const { createMod } = require('../framework/framework');

const mod = createMod('Super Jump', 'tomb123', ['tomb1.dll','tomb2.dll','tomb3.dll']);

mod.init(function() {
    try {
        game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
    } catch(e) {
        game._lara = null;
    }
});

mod.hook('InitializeLevelAI')
    .onLeave(function(returnValue) {
        try {
            game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
        } catch(e) {
            game._lara = null;
        }
    });

mod.loop('superJump')
    .every(5)
    .run(function() {
        if (!game._lara || game._lara.isNull()) return;

        const roomType = game.readVar(game.module, 'RoomType');
        if (roomType !== 0) return;

        const maxJumpSpeed = 175;
        const current = game._lara.add(ENTITY_Y_SPEED).readS16();
        let newSpeed = current;

        if (game._superJumpActive) {
            if (current < 0) {
                newSpeed = Math.max(-maxJumpSpeed, current - 25);
                game._lara.add(ENTITY_Y_SPEED).writeS16(newSpeed);
            }
            if (newSpeed <= -maxJumpSpeed || (current < 0 && newSpeed >= 0)) {
                game._superJumpActive = false;
            }
        } else if (current === 0) {
            game._superJumpActive = true;
        }
    });

mod.exit(function() {
    game._lara = null;
    game._superJumpActive = false;
});

module.exports = mod;
