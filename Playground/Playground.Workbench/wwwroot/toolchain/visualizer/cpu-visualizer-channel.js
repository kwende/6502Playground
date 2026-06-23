const channelName = "6502-playground-cpu-visualizer";
const subscriptions = new Map();

let channel;
let nextSubscriptionId = 1;

export function openVisualizer(message) {
    const url = new URL("cpu-visualizer", document.baseURI).href;
    const features = "popup,width=1080,height=760,resizable=yes,scrollbars=yes";
    const popup = window.open(url, "cpu6502Visualizer", features);

    if (!popup) {
        return false;
    }

    popup.focus();
    postVisualizerMessage(message);
    window.setTimeout(() => postVisualizerMessage(message), 250);
    window.setTimeout(() => postVisualizerMessage(message), 1000);

    return true;
}

export function postVisualizerMessage(message) {
    getChannel().postMessage(message);
}

export function subscribe(dotNetReference) {
    const subscriptionId = nextSubscriptionId++;
    const listener = (event) => dotNetReference.invokeMethodAsync("OnCpuVisualizerMessage", event.data);

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
