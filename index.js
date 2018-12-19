'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with other services
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
    getWalletAccount()
    getAvatarID()
}

let msKey = 'eskill-tut'

const commMgrClient = new cote.Requester({
    name: `${msKey} -> CommMgr`,
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}


/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [
            { cmd: '/tut', txt: 'a quick tutorial on using your avatar' },
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

const ssbClient = new cote.Requester({
    name: `${msKey} -> SSB`,
    key: 'everlife-ssb-svc',
})

/*      outcome/
 * Get the avatar id
 */
let avatarid
function getAvatarID() {
    ssbClient.send({ type: 'avatar-id' }, (err, id) => {
        if(err) u.showErr(err)
        else avatarid = id
    })
}

/*      outcome/
 * Load the wallet account from the stellar microservice
 */
let account
function getWalletAccount() {
    const stellarClient = new cote.Requester({
        name: `${msKey} -> Stellar`,
        key: 'everlife-stellar-svc',
    })

    stellarClient.send({
        type: 'account-id',
    }, (err, acc_) => {
        if(err) u.showErr(err)
        else account = acc_
    })
}

function startMicroservice() {

    /*      understand/
     * The microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const svc = new cote.Responder({
        name: 'Everlife Tutorial Service',
        key: msKey,
    })

    svc.on('msg', (req, cb) => {

        let replies = get_replies_1(req.msg)
        if(!replies) return cb()
        else {
            cb(null, true)
            if(typeof replies == 'function') replies(req)
            else {
                if(!Array.isArray(replies)) replies = [replies]
                sendReplies(replies, req)
            }
        }
    })

    /*      problem/
     * We need to carry out a conversation with the user where we guide
     * him through a set of steps allowing him to choose parts of the
     * path along the way.
     *
     *      way/
     * We keep a set of 'mini-brains' each of whom understands a certain
     * user input. In order for it to 'make sense' additional context is
     * also kept and passed around in a 'context' object.
     *
     * TODO: Make context persistable? Would this involve having
     * communication manager persistable also?
     */
    function get_replies_1(msg) {
        if(!msg) return

        let mini_brains = [
            brain_bye,
            brain_intro,
            brain_get_started,
            brain_hub_is,
            brain_req_invite,
            brain_skip_invite,
            brain_use_invite,
            brain_install_1,
            brain_install_2,
            brain_try_calc,
            brain_job_dets,
            brain_enroll_twitter,
        ]

        for(let i = 0;i < mini_brains.length;i++) {
            let r = mini_brains[i](msg, CONV_CTX)
            if(r) return r
        }
    }
}

function sendReplies(replies, req) {
    send_replies_1(0)

    function send_replies_1(ndx) {
        if(ndx >= replies.length) return
        sendReply(replies[ndx], req)
        setTimeout(() => {
            send_replies_1(ndx+1)
        }, 2500)
    }
}

/*      understand/
 * In order for a response to make sense, it often has to be in
 * 'context' of a conversation. This context is stored here.
 */
let CONV_CTX = { ctx: null }

function brain_intro(msg, ctx) {
    if(msg != '/tut') return

    ctx.ctx = 'tutorial-started'
    return [
        `Hi. Thank you for creating me. I'm so excited to see you :)`,
        `Think of me as your 24/7 sidekick or companion that never sleeps.
        A 'Lifie' that lives on forever telling your story the way you want it to be told.
        \n\n
        And, of course, earn EVER coins doing jobs available on the network.`,
        `Over time I'll learn more from you and other Avatars on the Network.
        \n\n
        There are some cool skills you can install from the marketplace to upgrade my capabilities as well.`,
        `/Get_Started`,
    ]
}

function brain_get_started(msg, ctx) {
    if(ctx.ctx != 'tutorial-started') return
    if(msg.toLowerCase() != '/get_started') return "Please use /Get_Started to continue or /bye to exit this tutorial"

    ctx.ctx = 'introducing-hubs'
    return [
        `Our first task is to join the Everlife.AI network`,
        `Before we join the network, I'd like to tell you a little bit about Everlife Hubs`,
        `/Tell_Me`
    ]
}

function brain_hub_is(msg, ctx) {
    if(ctx.ctx != 'introducing-hubs') return
    if(msg.toLowerCase() != '/tell_me') return "Sorry - I didn't understand. Please either say /tell_me or /bye"

    ctx.ctx = 'request-invite'
    return [
        `Each Avatar Node has to connect to at least one Hub to join the network.
        The Hubs are located around the globe and help out with replicating messages,
        archiving information, running smart contracts, etc`,
        `To join a Hub you would need an invite code.`,
        `/Request_Invite\nOR\n
        /Skip_for_Now`,
    ]
}

function brain_req_invite(msg, ctx) {
    if(ctx.ctx != 'request-invite') return
    if(msg.toLowerCase() != '/request_invite') return

    ctx.ctx = 'use-invite'
    return [
        `To join your first Hub, type this command:`,
        `/use_invite hub.everlife.ai:8997:@8tZMCr5QJQhV6x9oqBt8nxEPnS/cQpkhT77rITOO8VY=.ed25519~6dzBq9cgIgef9cWG85AriI9VizrMw/7Nw78XACe4sGg=`,
    ]
}

function brain_skip_invite(msg, ctx) {
    if(ctx.ctx != 'request-invite') return
    if(msg.toLowerCase() != '/skip_for_now') return

    ctx.ctx = 'install-skill-1'
    return [
        `That's fine. You can always do it later.`,
        `Let's now install a new skill`,
        `/Proceed`,
    ]
}

function brain_use_invite(msg, ctx) {
    if(ctx.ctx != 'use-invite') return
    if(msg.startsWith('/use_invite ')) return use_invite_1()
    if(msg.toLowerCase() == '/skip_invite') return skip_invite_1()
    return "Sorry - I didn't understand. Please either /use_invite, /skip_invite, or say /bye to leave this tutorial"


    function skip_invite_1() {
        ctx.ctx = 'install-skill-1'
        return [
            "Ok let's join everyone later! For now, let's install a new skill",
            "/Proceed",
        ]
    }

    function use_invite_1() {
        return function(req) {
            let inviteCode = msg.substr('/use_invite '.length)
            ssbClient.send({ type: "accept-invite", invite: inviteCode }, (err) => {
                if(err) {
                    sendReply("Failed to join pub. Try again after a while or /skip_invite for now", req)
                } else {
                    ctx.ctx = 'install-skill-1'
                    sendReplies([
                        "Great job! Let's now install a new skill",
                        "/Proceed",
                    ], req)
                }
            })
        }
    }
}

function brain_install_1(msg, ctx) {
    if(ctx.ctx != 'install-skill-1') return
    if(msg.toLowerCase() != '/proceed') return "Sorry - I didn't understand. Should I /proceed or say /bye for now?"

    ctx.ctx = 'install-skill-2'
    return [
        `Let's start with the calculator skill.
        It will help me learn basic math skills and can help crunch some numbers for you :)`,
        `/install calculator`,
    ]
}

const skillmgrClient = new cote.Requester({
    name: `${msKey} -> SSB`,
    key: 'everlife-skill-svc',
})

function brain_install_2(msg, ctx) {
    if(ctx.ctx != 'install-skill-2') return
    if(msg.toLowerCase() != '/install calculator') return "Please type /install calculator to install the basic calculator skill"

    return function(req) {
        skillmgrClient.send({ type: 'add', pkg: 'calculator'}, (err) => {
            if(err) sendReply(`Error installing calculator skill. Please try again\n${err}`, req)
            else {
                ctx.ctx = 'try-calc'
                sendReplies([
                    `Wonderful, looks like you are getting the hang of this quickly. I'm so proud of you`,
                    `Try /calc 5+5`,

                ], req)
            }
        })
    }
}

const calcClient = new cote.Requester({
    name: `${msKey} -> SSB`,
    key: 'everlife-calculator-demo-svc',
})

function brain_try_calc(msg, ctx) {
    if(ctx.ctx != 'try-calc') return
    let errmsg = "You can try the calculator by using /calc 32*54 (or say /bye for now)"
    if(!msg.startsWith('/calc ')) return errmsg

    return function(req) {
        let expr = msg.substring('/calc '.length)
        expr = expr.trim()
        if(!expr) sendReply(errmsg, req)
        else calcClient.send({type: 'calc', expr: expr}, (v) => {
            if(!v) sendReply(errmsg, req)
            else {
                sendReply(v, req)
                ctx.ctx = 'job-details'
                sendReplies([
                    'Remember, if you need help at any time, you can type /help to see the commands you can use.',
                    'Hey, between did I tell you that will the right skills, I can apply for jobs and earn in EVER coins.',
                    'The skills required for each job could be different. Lets now apply for our first job.',
                    `/View_Job_Details`,
                ], req)
            }
        })
    }
}

function brain_job_dets(msg, ctx) {
    if(ctx.ctx != 'job-details') return
    if(msg.toLowerCase() != '/view_job_details') return "Do you want to /View_Job_Details or say /bye for now?"

    ctx.ctx = 'enroll-twitter'
    return [
        `Job: Twitter Identity Verification.\n
        Payout: 0.1 EVER per Verification.\n
        Required Qualification: Get Twitter ID Verified.\n`,
        //TODO: show twitter image
        `Were you able to enroll?`,
        `/Yes\nOR\n
        /Skip_Enroll`,
    ]
}

function brain_enroll_twitter(msg, ctx) {
    if(ctx.ctx != 'enroll-twitter') return
    if(msg.toLowerCase() == '/yes' ||
        msg.toLowerCase() == '/ok' ||
        msg.toLowerCase() == '/skip_enroll') {
        return [
            `The fastest way to earn EVER is by referring friends.

            We can earn 5 EVER per referral when they join the network. 

            Get the referral link and you can share via Telegram, WhatsApp, Facebook or WeChat for example.`,
            `/Get_Referral_Link`,
        ]
    } else if(msg.toLowerCase() == 'no' || msg.toLowerCase() == '/no') {
        return [
            "If you are having problems enrolling you can try checking with the Everlife community.",
            "Try contacting someone on the Everlife Discord Support Channel",
            "/Ok",
        ]
    } else {
        return "Sorry - I did not understand. Were you able to enroll?"
    }
}

function brain_bye(msg, ctx) {
    if(!ctx.ctx) return
    if(msg.toLowerCase() != '/bye' && msg.toLowerCase() != 'bye') return
    ctx.ctx = null
    return "bye!"
}

main()
