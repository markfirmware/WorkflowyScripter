// ==UserScript==
// @name         Wfs0Nothing
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  WorkflowyScripty does nothing
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
    return {
        name: 'nothing'
    }
})