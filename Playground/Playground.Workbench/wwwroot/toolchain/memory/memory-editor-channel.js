const channelName = "6502-playground-memory-editor";
const subscriptions = new Map();

let channel;
let memoryEditorWindow;
let nextSubscriptionId = 1;
let closeAnnouncementRegistered = false;

export function openMemoryEditor(message) {
    const url = new URL("memory-editor", document.baseURI).href;
    const features = "popup,width=1180,height=720,resizable=yes,scrollbars=yes";
    const popup = window.open(url, "cpu6502MemoryEditor", features);

    if (!popup) {
        return false;
    }

    memoryEditorWindow = popup;
    popup.focus();
    postMemoryEditorMessage(message);
    window.setTimeout(() => postMemoryEditorMessage(message), 250);
    window.setTimeout(() => postMemoryEditorMessage(message), 1000);

    return true;
}

export function closeMemoryEditor() {
    if (memoryEditorWindow && !memoryEditorWindow.closed) {
        memoryEditorWindow.close();
    }

    postMemoryEditorMessage({ Kind: "closed" });
}

export function postMemoryEditorMessage(message) {
    getChannel().postMessage(message);
}

export function registerCloseAnnouncement() {
    if (closeAnnouncementRegistered) {
        return;
    }

    const announceClosed = () => {
        postMemoryEditorMessage({ Kind: "closed" });
    };

    window.addEventListener("pagehide", announceClosed, { once: true });
    window.addEventListener("beforeunload", announceClosed, { once: true });
    closeAnnouncementRegistered = true;
}

export function subscribe(dotNetReference) {
    const subscriptionId = nextSubscriptionId++;
    const listener = (event) => dotNetReference.invokeMethodAsync("OnMemoryEditorMessage", event.data);

    getChannel().addEventListener("message", listener);
    subscriptions.set(subscriptionId, listener);

    return subscriptionId;
}

export function unsubscribe(subscriptionId) {
    const listener = subscriptions.get(subscriptionId);
    if (!listener) {
        return;
    }

    getChannel().removeEventListener("message", listener);
    subscriptions.delete(subscriptionId);
}

function getChannel() {
    channel ??= new BroadcastChannel(channelName);
    return channel;
}
