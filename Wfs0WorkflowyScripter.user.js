// ==UserScript==
// @name         Wfs0WorkflowyScripter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Browser userscript services for Workflowy
// @author       Mark E Kendrat
// @match        https://workflowy.com
// @match        https://beta.workflowy.com
// @match        https://dev.workflowy.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=workflowy.com
// @grant        none
// ==/UserScript==

await (async () => {
    'use strict'
    const { h, text, app } = await import('https://unpkg.com/hyperapp')
    const script_name = 'WorkflowyScripter'
    const saved_wfeventlistener = window.WFEventListener
    var current_wfeventlistener
    window.WFEventListener = event => trap(() => {
        current_wfeventlistener?.(event)
        saved_wfeventlistener?.(event)
    })
    var stopHyperAppFn
    var WF
    const trap = f => {
        try {
            f()
        } catch (e) {
            console.log('trap', script_name, e)
        }
    }
    const DevMode = (() => {
        const isOn = log => true
        const ShowInfoMessage = log => [record(log, 'ShowInfoMessage'), () => WF.showMessage('show message')]
        const ResetLog = _ => [record(initialLog(), "ResetLog")]
        const ToggleShowLog = log => [record(log, "ToggleShowLog", { showLog: !q.showLog(log) })]
        return { isOn, ShowInfoMessage, ResetLog, ToggleShowLog }
    })()
    current_wfeventlistener = event => {
        if (event == WfEvents.documentReady) {
            WF = window.WF
            const log = Scripts.collectScripts()
            startHyperApp(log) // Starred.allQueries()
        }
    }
    const Keyboard = (() => {
        const listenToKeydown = (dispatch, action) => {
            const handler = e => trap (() => dispatch(action, e))
            window.addEventListener('keydown', handler)
            return () => window.removeEventListener('keydown', handler)
        }
        return {
            onKeydown: action => [listenToKeydown, action]
        }
    })()
    const actions = {
        Keydown: (log, e) => WfShowMessage.restartHyperApp(log, e.ctrlKey && e.key == 'l', () => e.preventDefault()),
        WfEvent: (log, event) => [record(log, event)],
        WfShowMessageRemoved: log => [record(log, 'WfShowMessageRemoved', !q.isGuidanceIssued(log) && { guidanceissued: true }), q.isGuidanceIssued(log) || (() => WF.showMessage('The ' + script_name + ' message can be toggled with control-l'))],
    }
    const q = {
        isGuidanceIssued: log => q.mostRecent(log, 'guidanceissued', false),
        mostRecent: (log, propertyName, def = '') => {
            for (const x of log) {
                const y = x[propertyName]
                if (y !== undefined) {
                    return y
                }
            }
            return def
        },
        focusedId: log => q.mostRecent(log, 'focusedId'),
        focusedItem: log => WF.getItemById(q.focusedId(log)),
        focusedName: log => {
            const item = q.focusedItem(log)
            return item == null ? null : item.getNameInPlainText()
        },
        currentId: log => q.mostRecent(log, 'currentId'),
        currentItem: log => WF.getItemById(q.mostRecent(log, 'currentId')),
        query: log => q.mostRecent(log, 'query'),
        showLog: log => q.mostRecent(log, 'showLog', false),
    }
    const record = (log, event, more) => {
        var r = { event: event }
        var x = WF.currentItem().getId()
        if (x != q.currentId(log)) {
            r.currentId = x
        }
        const query_or_null = WF.currentSearchQuery()
        x = query_or_null ? query_or_null.trim() : ""
        if (x != q.query(log)) {
            r.query = x
        }
        x = WF.focusedItem()?.getId() || ""
        if (x != q.focusedId(log)) {
            r.focusedId = x
        }
        return [{ ...r, ...more }, ...log]
    }
    const logItemToString = r => {
        var s = ""
        for (const [k, v] of Object.entries(r)) {
            s += (k != "event" ? k + ":" : "" ) + v + " "
        }
        return s
    }
    const Starred = (() => {
        const allQueries = () => {
            return WF.starredLocations()
                .filter(x => x.search != null)
                .map(x => x.search)
                .sort()
                .reverse()
                .reduce((acc, i) => {
                acc[i.startsWith("@") ? 1 : 0].push(i)
                return acc
            }, [[], []]).flat().reduce((list, x) => [{ event: 'StarredQuery', query: x }, ...list], [])
        }
        return { allQueries }
    })()
    const WfEvents = (() => {
        const listenToWfEvent = (dispatch, action) => {
            current_wfeventlistener = event => dispatch(action, event)
            return () => { current_wfeventlistener = null }
        }
        const onEvent = (action) => [listenToWfEvent, action]
        return {
            onEvent,
            documentReady: 'documentReady',
            locationChanged: 'locationChanged',
            searchTyped: 'searchTyped',
        }})()
    const startHyperApp = log => {
        stopHyperAppFn?.()
        WfShowMessage.show(`<div id="${WfShowMessage.app_dom_id}"></div>`)
        stopHyperAppFn = app({
            node: WfShowMessage.appElement(),
            init: [record(log, "startHyperApp")],
            view: log =>
            h("div", { title: script_name, style: { "text-align": "left" } }, [
                h("span", {}, [
                    Scripts.selectScript(log),
                    DevMode.isOn(log) && h('button', { onclick: DevMode.ShowInfoMessage }, text('show message')),
                    DevMode.isOn(log) && h("button", { onclick: DevMode.ToggleShowLog, title: "hide/show event log" },
                                           text(log.length.toString().padStart(3, "0") + (log.length == 1 ? "  event" : " events"))),
                ]),
                text(" "),
                Scripts.currentScript(log)?.hyperApp?.view?.(log),
                h("div", { hidden: !q.showLog(log) || log.length == 0 }, [
                    h("button", { onclick: actions.DevResetLog, title: "reset event log" }, text("reset")),
                    h("div", {},
                      h("ul", {}, log.slice(0, 10).map(x => h("li", {}, text(logItemToString(x))))),
                     )]),
            ]),
            subscriptions: log => [Keyboard.onKeydown(actions.Keydown),
                                   WfEvents.onEvent(actions.WfEvent),
                                   WfShowMessage.onRemoved(actions.WfShowMessageRemoved)],
        })
    }
    const WfShowMessage = (() => {
        const showMessageClassName = ' _171q9nk'
        const app_dom_id = script_name + '-showmessage-div'
        const show = html => WF.showMessage(html)
        const listenToWfShowMessageRemoved = (dispatch, action) => {
            const observer = new MutationObserver(
                (mutations_list) => {
                    trap(() => {
                        mutations_list.forEach((mutation) => {
                            mutation.removedNodes.forEach((removed_node) => {
                                if(removed_node.className == showMessageClassName) {
                                    dispatch(action)
                                }
                            })
                        })
                    })
                })
            observer.observe(document.body, { subtree: true, childList: true })
            return () => observer.disconnect()
        }
        const onRemoved = (action) => [listenToWfShowMessageRemoved, action]
        const isAppShown = () => document.getElementById(WfShowMessage.app_dom_id) && true
        const appElement = () => document.getElementById(app_dom_id)
        const restartHyperApp = (log, condition, f) => {
            if (condition) {
                f?.()
                if (isAppShown()) {
                    return [log, () => WF.hideMessage()]
                } else {
                    startHyperApp(log)
                }
            } else {
                return [log]
            }
        }
        return { show, app_dom_id, isAppShown, appElement, onRemoved, restartHyperApp }
    })()
    const Scripts = (() => {
        var scripts = new Map()
        const names = () => {
            const keys = []
            for (const key of scripts.keys()) {
                keys.push(key)
            }
            return keys
        }
        const collectScripts = () => {
            const wfsApi = { crumbs, currentScriptName, h, openClientWindow, q, record, text, WF, WfEvents }
            if (window.WfsScripts !== undefined) {
                for (const x of window.WfsScripts) {
                    const script = x(wfsApi)
                    scripts.set(script.name, { hyperApp: { view: _ => null }, ...script })
                }
            }
            return record([], "WfsInitialScript", { scriptName: names()?.[0] || 'no name' })
        }
        const crumbs = (log, now = null, already = []) => {
            if (now == null) {
                return crumbs(log, q.currentItem(log), already)
            } else if (now.isMainDocumentRoot()) {
                return [now, ...already]
            } else {
                return crumbs(log, now.getParent(), [now, ...already])
            }
        }
        const selectScriptElementId = script_name + "-select-script"
        const selectScript = log => h("select", {
            id: selectScriptElementId,
            onchange: (_, e) => [ChangeScript, e.target.value],
            title: "WorkflowyScripter - select script"
        }, names().map(x => h("option", {selected: x == currentScriptName(log)}, text(x))))
        const currentScriptName = log => q.mostRecent(log, 'scriptName', 'no name')
        const currentScript = log => scripts.get(currentScriptName(log))
        const ChangeScript = (log, scriptName) => [record(log, "ChangeScript", { scriptName })]
        return { selectScript, collectScripts, currentScript }
    })()
    const ClientLib = (the_script_name, the_channel_name) => {
        const script_name = the_script_name
        const channel_name = the_channel_name
        const Broadcast = (() => {
            const tx = new BroadcastChannel(channel_name)
            const listen = (dispatch, action) => {
                const rx = new BroadcastChannel(channel_name)
                rx.onmessage = (m) => {
                    console.log('rx', script_name, channel_name, m.data)
                    dispatch(action, m.data)
                }
                return () => rx.close()
            }
            const onMessage = (action) => [listen, action]
            const fxPost = (event, data) => {
                tx.postMessage({ event, data })
            }
            const fxPostClientRequest = (f, args) => {
                fxPost('clientrequest', { f, args })
            }
            return { onMessage, fxPostClientRequest }
        })()
        return { script_name, channel_name, Broadcast }
    }
    const ClientResponder = (() => {
        const channel_name = script_name + Date.now()
        const clientRequestEvent = 'clientrequest'
        const serverResponseEvent = 'serverresponse'
        const toJson = (item, depth = 0) => {
            const it = ({
                id: item.getId(),
                name: item.getNameInPlainText(),
                lastModifiedDate: item.getLastModifiedDate(),
                numChildren: item.getChildren().length,
                numDescendants: item.getNumDescendants(),
            })
            if (depth > 0) {
                it.children = item.getChildren().map((x => toJson(x, depth - 1)))
            } else {
                it.children = []
            }
            return it
        }
        const fxPost = (event, data) => {
            const m = { event, data }
            // console.log('tx', channel_name, m)
            bc.postMessage(m)
        }
        const fxPostServerResponse = (request, response) => {
            fxPost(serverResponseEvent, { request, response })
        }
        const bc = new BroadcastChannel(channel_name)
        bc.onmessage = (m) => {
            try {
                const request = m.data
                // console.log('rx', request)
                if (request.event == clientRequestEvent) {
                    if (request.data.f == 'getState') {
                        WF.starredLocations()
                            .filter((x) => x.search != null)
                            .map((x) => x.search)
                            .sort()
                            .reverse()
                            .reduce((acc, i) => {
                            acc[i.startsWith('@') ? 1 : 0].push(i)
                            return acc
                        }, [[], []]).flat().map((x) => fxPostServerResponse(request, { is_starred: true, query: x }))
                    }
                    else if (request.data.f == 'getItemById') {
                        fxPostServerResponse(request, toJson(WF.getItemById(request.data.args.id), 1))
                    } else {
                        fxPostServerResponse(request, {error: 'invalid function'})
                    }
                }
            } catch (exception) {
                console.log('exception', script_name, exception)
            }
        }
        return { channel_name }
    })()
    const openClientWindow = (script_name, client) => {
        const page = `
                    <html>
                         <title>${script_name}</title>
                         <script type="module">
                             try {
                                 const client = ${client}
                                 const clientLib = ${ClientLib}
                                 client(clientLib('${script_name}', '${ClientResponder.channel_name}'))
                             } catch (exception) {
                                 console.log('exception', script_name, exception)
                             }
                         </script>
                     </html>`
                const d = window.open().document
                d.open()
        d.write(page)
        d.close()
    }
    })()
