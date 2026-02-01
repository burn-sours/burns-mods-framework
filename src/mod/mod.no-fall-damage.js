const { createMod } = require('../framework/framework');

const mod = createMod('No Fall Damage', 'tomb123', ['tomb1.dll','tomb2.dll','tomb3.dll']);

mod.init(function() {
    try {
        game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
    } catch(e) {
        game._lara = null;
    }
});

mod.hook('LaraInLevel')
    .onLeave(function(returnValue) {
        try {
            game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
        } catch(e) {
            game._lara = null;
        }
    });

mod.loop('noFallDamage')
    .every(50)
    .run(function() {
        send({
            event: 'stateUpdate',
            data: {
                level: game.readVar(game.module, 'LevelId'),
                laraActive: !!(game._lara && !game._lara.isNull())
            }
        });

        const roomType = game.readVar(game.module, 'RoomType');
        if (roomType !== 0) return;

        if (game._lara && !game._lara.isNull()) {
            try {
                const maxSpeed = 130;
                const speed = game._lara.add(ENTITY_Y_SPEED).readS16();
                if (speed > maxSpeed) {
                    game._lara.add(ENTITY_Y_SPEED).writeS16(maxSpeed);
                }
            } catch (e) {
                error('No Fall Damage error:', e);
            }
        }
    });

mod.exit(function() {
    game._lara = null;
});

module.exports = mod;
