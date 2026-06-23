const monacoBasePath = "./_content/Playground.Workbench/lib/monaco/vs";
const editors = new Map();

let loadPromise;
let nextEditorId = 1;

export async function createEditor(container, dotNetReference, value) {
    await loadMonaco();
    registerAsm6502Language();

    const editor = monaco.editor.create(container, {
        value: value ?? "",
        language: "asm6502",
        theme: "vs-dark",
        automaticLayout: true,
        fontFamily: "Consolas, 'Cascadia Mono', monospace",
        fontSize: 15,
        lineHeight: 22,
        minimap: { enabled: false },
        glyphMargin: true,
        folding: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        roundedSelection: false,
        tabSize: 4,
        insertSpaces: true,
        wordBasedSuggestions: "off",
    });

    const id = `asm6502-${nextEditorId++}`;
    const host = {
        editor,
        changeSubscription: null,
        activeDecorations: [],
        suppressChange: false,
    };

    host.changeSubscription = editor.onDidChangeModelContent(() => {
        if (host.suppressChange) {
            return;
        }

        dotNetReference.invokeMethodAsync("OnEditorTextChanged", editor.getValue());
    });

    editors.set(id, host);

    return id;
}

export function setValue(id, value) {
    const host = getEditorHost(id);
    const nextValue = value ?? "";
    if (host.editor.getValue() === nextValue) {
        return;
    }

    host.suppressChange = true;
    host.editor.setValue(nextValue);
    host.suppressChange = false;
}

export function setActiveLine(id, lineNumber) {
    const host = getEditorHost(id);
    const editor = host.editor;
    const model = editor.getModel();
    const normalizedLineNumber = Number(lineNumber);

    if (!model || !Number.isInteger(normalizedLineNumber) || normalizedLineNumber < 1 || normalizedLineNumber > model.getLineCount()) {
        host.activeDecorations = editor.deltaDecorations(host.activeDecorations, []);
        return;
    }

    host.activeDecorations = editor.deltaDecorations(host.activeDecorations, [
        {
            range: new monaco.Range(normalizedLineNumber, 1, normalizedLineNumber, 1),
            options: {
                isWholeLine: true,
                className: "current-instruction-line",
                glyphMarginClassName: "current-instruction-glyph",
                linesDecorationsClassName: "current-instruction-line-number",
                lineNumberClassName: "current-instruction-line-number",
            },
        },
    ]);

    editor.revealLineInCenterIfOutsideViewport(normalizedLineNumber);
}

export function disposeEditor(id) {
    const host = editors.get(id);
    if (!host) {
        return;
    }

    host.changeSubscription.dispose();
    host.editor.dispose();
    editors.delete(id);
}

function getEditorHost(id) {
    const host = editors.get(id);
    if (!host) {
        throw new Error(`Unknown Monaco editor '${id}'.`);
    }

    return host;
}

function loadMonaco() {
    loadPromise ??= new Promise((resolve, reject) => {
        if (globalThis.monaco) {
            resolve();
            return;
        }

        const loader = document.createElement("script");
        loader.src = `${monacoBasePath}/loader.js`;
        loader.onload = () => {
            globalThis.require.config({ paths: { vs: monacoBasePath } });
            globalThis.require(["vs/editor/editor.main"], resolve, reject);
        };
        loader.onerror = () => reject(new Error("Failed to load Monaco editor."));
        document.head.appendChild(loader);
    });

    return loadPromise;
}

function registerAsm6502Language() {
    if (monaco.languages.getLanguages().some((language) => language.id === "asm6502")) {
        return;
    }

    monaco.languages.register({ id: "asm6502" });
    monaco.languages.setMonarchTokensProvider("asm6502", {
        defaultToken: "",
        ignoreCase: true,
        tokenizer: {
            root: [
                [/;.*/, "comment"],
                [/\.[a-z_][\w.]*/, "keyword"],
                [/[a-z_.$@?][\w.$@?]*:/, "type.identifier"],
                [/\b(lda|ldx|ldy|sta|stx|sty|tax|tay|txa|tya|tsx|txs|pha|php|pla|plp|and|eor|ora|bit|adc|sbc|cmp|cpx|cpy|inc|inx|iny|dec|dex|dey|asl|lsr|rol|ror|jmp|jsr|rts|brk|rti|bcc|bcs|beq|bmi|bne|bpl|bvc|bvs|clc|cld|cli|clv|sec|sed|sei|nop)\b/, "keyword"],
                [/#?\$[0-9a-f]+/, "number.hex"],
                [/#?%[01]+/, "number.binary"],
                [/#?\b\d+\b/, "number"],
                [/"[^"]*"/, "string"],
                [/[,:#()+\-*/]/, "delimiter"],
            ],
        },
    });
}
