// ==UserScript==
// @name         Wfs0Crumbs
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  WorkflowyScripter show bread crumbs
// @author       Mark E Kendrat
// @match        https://workflowy.com
// @match        https://beta.workflowy.com
// @match        https://dev.workflowy.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=workflowy.com
// @grant        none
// ==/UserScript==

if (window.WfsScripts === undefined) {
    window.WfsScripts = []
}
window.WfsScripts.push(wfsApi => {
    'use strict'
    const { crumbs, h, text } = wfsApi
    return {
        name : 'crumbs',
        hyperApp: {
            view: s => h('div', {},
                         crumbs(s).map(x => h('div', {}, text(x.getNameInPlainText()))))
        }
    }
})