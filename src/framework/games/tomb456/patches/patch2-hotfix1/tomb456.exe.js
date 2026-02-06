/** tomb456.exe - Patch 2 Hotfix 1 */
const patch2 = require("../patch2/tomb456.exe");

module.exports = {
    constants: patch2.constants,

    variables: patch2.variables,

    hooks: {
        KeyboardInput: { Address: "0x1930", Params: ['int'], Return: 'int' },
        TickFunction: { Address: "0xa1d0", Params: ['pointer'], Return: 'void' },
        UpdateTickRef: { Address: "0xa310", Params: [], Return: 'void' },
    }
};
