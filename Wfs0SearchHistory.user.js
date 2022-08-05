// ==UserScript==
// @name         Wfs0SearchHistory
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  WorkflowyScrioter search history
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
    const { h, text, WF, WfEvents, q, record } = wfsApi
    const selectElementId = 'WorkflowyLens.searchHistorySelectElement.id'
    const getHistory = log => {
        const h = [""]
        for (const r of stableQueries(log)) {
            if (r?.query && !h.includes(r.query)) {
                h.push(r.query)
            }
        }
        return h
    }
    const stableQueries = log => {
        const log2 = []
        var i = 0
        while (i < log.length) {
            if (i + 1 < log.length &&
                log[i + 0].event == WfEvents.searchTyped &&
                log[i + 1].event == WfEvents.locationChanged &&
                log[i + 1].query !== undefined) {
                log2.push(log[i + 1])
                var x = log[i + 1].query
                i += 2
                while (i + 1 < log.length &&
                       log[i + 0].event == WfEvents.searchTyped &&
                       log[i + 1].event == WfEvents.locationChanged &&
                       log[i + 1].query !== undefined &&
                       x.startsWith(log[i + 1].query)) {
                    x = log[i + 1].query
                    i += 2
                }
            } else {
                if (log[i + 0] !== undefined) {
                    log2.push(log[i + 0])
                }
                i += 1
            }
        }
        return log2
    }
    const ChangeSearch = (log, query) => [record(log, "ChangeSearch", { query }), () => WF.search(query)]
    const fxFocusSearchHistory = () => requestAnimationFrame(() => document.getElementById(selectElementId)?.focus())
    return {
        name : 'search history',
        hyperApp: {
            view: log =>
            getHistory(log).length > 1 &&
            h("span", { style: { position: "absolute",
                                right: "50px",
                                top: "50%",
                                "-ms-transform": "translateY(-50%)",
                                transform: "translateY(-50%)"
                               } }, [
                text("search "),
                text("history "),
                h("select", {
                    id: selectElementId,
                    onchange: (_, e) => [ChangeSearch, e.target.value],
                    title: "search history including starred"
                }, getHistory(log).map(x => h("option", {selected: x == q.query(log), title: x}, text(x))))
            ]),
        }
    }
})
