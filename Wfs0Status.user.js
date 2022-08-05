// ==UserScript==
// @name         Wfs0Status
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  WorkflowyScripty show status
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
    const { h, q, text } = wfsApi
    return {
        name : 'status',
        hyperApp: {
            view: s => h('span', {}, [
                text(q.currentItem(s).getNameInPlainText())
            ])
        }
    }
})