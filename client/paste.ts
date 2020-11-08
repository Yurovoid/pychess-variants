import Module from '../static/ffish.js';

import h from 'snabbdom/h';
import { VNode } from 'snabbdom/vnode';

import { _ } from './i18n';
import { variantsIni } from './variantsIni';
import { VARIANTS } from './chess';
import { parseKif } from '../client/kif';

export function pasteView(model): VNode[] {
    let ffish = null;
    new (Module as any)().then(loadedModule => {
        ffish = loadedModule;
    });

    const importGame = (model, ffish) => {
        const e = document.getElementById("pgnpaste") as HTMLInputElement;
        //console.log('PGN:', e.value);

        if (ffish !== null) {
            ffish.loadVariantConfig(variantsIni);
            const XHR = new XMLHttpRequest();
            const FD  = new FormData();

            let variant, initialFen, board, mainlineMoves;

            try {
                if (e.value.startsWith('#KIF version=2.0 encoding=UTF-8')) {
                    variant = 'shogi';
                    const mainlineMoves = parseKif(e.value);
                    console.log(mainlineMoves);

                    board = new ffish.Board(variant);

                    for (let idx = 0; idx < mainlineMoves.length; ++idx) {
                        //console.log(idx, mainlineMoves[idx]);
                        board.push(mainlineMoves[idx]);
                    }

                    FD.append('Variant', variant);
                    FD.append('White', 'White');
                    FD.append('Black', 'Black');
                    FD.append('moves', mainlineMoves.join(' '));
                    FD.append('final_fen', board.fen());
                    FD.append('username', model["username"]);

                    board.delete();

                } else {

                    const game = ffish.readGamePGN(e.value);

                    variant = "chess";
                    const v = game.headers("Variant");
                    console.log("Variant:", v);
                    if (v) variant = v.toLowerCase();

                    initialFen = VARIANTS[variant].startFen;
                    const f = game.headers("FEN");
                    if (f) initialFen = f;

                    // TODO: crazyhouse960 but without 960? (export to lichess hack)
                    const is960 = variant.includes("960") || variant.includes('random');

                    board = new ffish.Board(variant, initialFen, is960);

                    mainlineMoves = game.mainlineMoves().split(" ");
                    for (let idx = 0; idx < mainlineMoves.length; ++idx) {
                        board.push(mainlineMoves[idx]);
                    }

                    const tags = game.headerKeys().split(' ');
                    tags.forEach((tag) => {
                        FD.append( tag, game.headers(tag) );
                    });
                    FD.append('moves', game.mainlineMoves());
                    FD.append('final_fen', board.fen());
                    FD.append('username', model["username"]);

                    board.delete();
                    game.delete();
                }
            }
            catch(err) {
                e.setCustomValidity(err.message ? _('Invalid PGN') : '');
                alert(err);
                return;
            }

            XHR.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    const response = JSON.parse(this.responseText);
                    if (response['gameId'] !== undefined) {
                        window.location.assign(model["home"] + '/' + response['gameId']);
                    } else if (response['error'] !== undefined) {
                        alert(response['error']);
                    }
                }
            };

            XHR.open("POST", "/import", true);
            XHR.send(FD);

        }
    }

    return [ h('div.paste', [
        h('div.container', [
            h('strong', _('Paste the PGN text here')),
            h('textarea#pgnpaste', {attrs: {spellcheck: "false"}}),
            h('div.import', [
                h('button#import', {on: { click: () => importGame(model, ffish) }}, [
                    h('i', {class: {"icon": true, "icon-cloud-upload": true} }, _('IMPORT GAME'))
                ])
            ])
        ])
    ])];
}
