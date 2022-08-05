// ==UserScript==
// @name         Wfs0Client
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Basic client window for Workflowy
// @author       Mark E Kendrat
// @match        https://workflowy.com
// @match        https://beta.workflowy.com
// @match        https://dev.workflowy.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=workflowy.com
// @grant        none
// ==/UserScript==

// in no particular order workflowy web browser client window
//  Services
//  FeaturesDemo
//  Schedule with clock
// promise exceptions
// push more
// use a stub for clientLib entries?

if (window.WfsScripts === undefined) {
    window.WfsScripts = []
}
window.WfsScripts.push(wfsApi => {
    'use strict'
    const { h, openClientWindow, text } = wfsApi
    const client = async (clientLib) => {
        console.log(clientLib.script_name, clientLib.channel_name)
        const { h, text, app } = await import("https://unpkg.com/hyperapp") // supplied
        const actions = {
            BroadcastReceived: (s, m) => {
                if (m.event == 'serverresponse') {
                    if (m.data.request.data.f == 'getItemById') {
                        mxParseItem(s, m.data.response)
                    }
                }
                return {...s, log: [m, ...s.log]}
            },
            ResetClient: (s) => [{...s, log: [{fyi: 'client reset'}],
                                  items: new Map()}, clientLib.Broadcast.fxPostClientRequest('getState')],
            ClearLog: (s) => ({ ...s, log: [{fyi: 'log cleared'}]}),
            ClearItems: (s) => [{ ...s, items: new Map(), log: [{fyi: 'items cleared'}, ...s.log]}],
            GetItemById: (s, id) => [s, clientLib.Broadcast.fxPostClientRequest('getItemById', { id }) ],
        }
        const mxParseItem = (s, r) => {
            const actual = r.children
            r.children = actual.map((i) => i.id)
            s.items.set(r.id, r)
            // console.log('set', r.name, r)
            for (const i of actual) {
                mxParseItem(s, i)
            }
        }
        const itemList = (items, id) => {
            const item = items.get(id)
            return h('li', {}, [
                itemText(item),
                h('ul', {}, item.children.map((id) => itemList(items, id)))
            ])
        }
        const itemText = (item) => {
            return h('span', {}, [
                text(item.name),
                item.numChildren &&
                item.children.length == 0 &&
                h('button', { onclick: [actions.GetItemById, item.id] }, text('more')),
            ])
        }
        app({
            node: document.body,
            init: { log: [], items: new Map() },
            view: ({ log, items }) =>
            h('div', {
                style: {
                    'height': '100%',
                    'font-family': 'monospace',
                    'color': 'white',
                    'background-color': 'black',
                }}, [
                h('div', {}, text(clientLib.script_name)),
                h('button', { onclick: actions.ResetClient }, text('reset client')),
                h('button', { onclick: actions.ClearLog }, text('clear log')),
                h('button', { onclick: [actions.GetItemById, 'None'] }, text('get items')),
                h('button', { onclick: actions.ClearItems }, text('clear items')),
                items.size && h('ul', {}, itemList(items, 'None')),
                h('div', {}, text('Log:')),
                h('div', {}, log.map(x =>
                                     h('div', {},
                                       text(x.event == 'request' ?
                                            'request ' + x.f : JSON.stringify(x))))),
            ]),
            subscriptions: () => [clientLib.Broadcast.onMessage(actions.BroadcastReceived)],
        })
    }
    const OpenWindow = log => {
        openClientWindow('Wfs0Client', client)
        return [log]
    }
    return {
        name : 'client',
        hyperApp: {
            view: s => h('button', { onclick: OpenWindow }, text('open window'))
        }
    }
})