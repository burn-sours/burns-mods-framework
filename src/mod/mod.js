const { createMod } = require('../framework/framework');

const mod = createMod('Burn\'s Mod Framework', 'tomb123', ['tomb1.dll', 'tomb2.dll', 'tomb3.dll']);

mod.init(function() {
    try {
        game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
        if (game._lara && !game._lara.isNull()) {
            log("Lara already in game", game._lara);
        }
    } catch(e) {
        game._lara = null;
    }
});

mod.hook('LaraInLevel')
    .onLeave(function(returnValue) {
        try {
            game._lara = game.getVarPtr(game.module, 'LaraBase').readPointer();
            if (game._lara && !game._lara.isNull()) {
                log("Lara entered the level", game._lara);
            }
        } catch(e) {
            game._lara = null;
        }
    });

mod.exit(function() {
    game._lara = null;
});

module.exports = mod;
