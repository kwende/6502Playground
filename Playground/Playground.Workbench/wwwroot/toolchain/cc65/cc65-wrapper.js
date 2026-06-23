import createCa65 from "./ca65.js";
import createLd65 from "./ld65.js";

const defaultWorkDir = "/work";
const defaultSourcePath = `${defaultWorkDir}/input.s`;
const defaultObjectPath = `${defaultWorkDir}/input.o`;
const defaultLinkerConfigPath = `${defaultWorkDir}/linker.cfg`;
const defaultOutputPath = `${defaultWorkDir}/output.bin`;
const defaultListingPath = `${defaultWorkDir}/input.lst`;

export async function assembleAndLink(request = {}) {
    const diagnostics = createDiagnostics();

    try {
        const options = normalizeRequest(request);

        const ca65 = await createCa65(makeModuleOptions(diagnostics.ca65.stdout, diagnostics.ca65.stderr));
        ensureDirectory(ca65.FS, options.workDir);
        ca65.FS.writeFile(options.sourcePath, options.source);

        runTool(ca65, "ca65", [
            ...options.ca65Args,
            "--listing",
            options.listingPath,
            "--list-bytes",
            "16",
            "-o",
            options.objectPath,
            options.sourcePath,
        ]);

        const objectBytes = ca65.FS.readFile(options.objectPath);
        const listingText = ca65.FS.analyzePath(options.listingPath).exists
            ? ca65.FS.readFile(options.listingPath, { encoding: "utf8" })
            : "";

        const ld65 = await createLd65(makeModuleOptions(diagnostics.ld65.stdout, diagnostics.ld65.stderr));
        ensureDirectory(ld65.FS, options.workDir);
        ld65.FS.writeFile(options.objectPath, objectBytes);

        const ld65Args = [];
        if (options.linkerConfig) {
            ld65.FS.writeFile(options.linkerConfigPath, options.linkerConfig);
            ld65Args.push("-C", options.linkerConfigPath);
        }

        ld65Args.push(
            ...options.ld65Args,
            "-o",
            options.outputPath,
            options.objectPath);

        runTool(ld65, "ld65", ld65Args);

        const outputBytes = ld65.FS.readFile(options.outputPath);
        return buildResult({
            success: true,
            diagnostics,
            objectBytes,
            outputBytes,
            listingText,
            sourceLineMappings: parseSourceLineMappings(listingText, options.loadAddress),
        });
    } catch (error) {
        return buildResult({
            success: false,
            diagnostics,
            error: error?.message || String(error),
        });
    }
}

function normalizeRequest(request) {
    if (typeof request.source !== "string") {
        throw new Error("assembleAndLink requires a source string.");
    }

    return {
        source: request.source,
        linkerConfig: typeof request.linkerConfig === "string" && request.linkerConfig.length > 0
            ? request.linkerConfig
            : null,
        workDir: defaultWorkDir,
        sourcePath: defaultSourcePath,
        objectPath: defaultObjectPath,
        linkerConfigPath: defaultLinkerConfigPath,
        outputPath: defaultOutputPath,
        listingPath: defaultListingPath,
        loadAddress: normalizeWord(request.loadAddress),
        ca65Args: normalizeStringArray(request.ca65Args, ["--cpu", "6502"], "ca65Args"),
        ld65Args: normalizeStringArray(request.ld65Args, [], "ld65Args"),
    };
}

function makeModuleOptions(stdout, stderr) {
    return {
        locateFile: (path) => new URL(`./${path}`, import.meta.url).href,
        print: (text) => stdout.push(text),
        printErr: (text) => stderr.push(text),
    };
}

function runTool(instance, name, args) {
    let result = 0;

    try {
        result = instance.callMain(args);
    } catch (error) {
        if (typeof error?.status === "number") {
            result = error.status;
        } else {
            throw new Error(`${name}: ${error?.message || error}`);
        }
    }

    const exitCode = typeof result === "number" ? result : instance.EXITSTATUS ?? 0;
    if (exitCode !== 0) {
        throw new Error(`${name} exited with status ${exitCode}.`);
    }
}

function ensureDirectory(FS, path) {
    let current = "";
    for (const part of path.split("/").filter(Boolean)) {
        current += `/${part}`;
        if (!FS.analyzePath(current).exists) {
            FS.mkdir(current);
        }
    }
}

function normalizeStringArray(value, fallback, name) {
    if (value === undefined || value === null) {
        return [...fallback];
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`${name} must be an array of strings.`);
    }

    return [...value];
}

function normalizeWord(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number & 0xFFFF : 0;
}

function createDiagnostics() {
    return {
        ca65: {
            stdout: [],
            stderr: [],
        },
        ld65: {
            stdout: [],
            stderr: [],
        },
    };
}

function buildResult({ success, diagnostics, error = null, objectBytes = null, outputBytes = null, listingText = "", sourceLineMappings = [] }) {
    const outputArray = outputBytes ? Array.from(outputBytes) : [];
    const objectArray = objectBytes ? Array.from(objectBytes) : [];

    return {
        success,
        error,
        diagnostics,
        diagnosticText: formatDiagnostics(diagnostics),
        objectByteLength: objectArray.length,
        outputByteLength: outputArray.length,
        outputBytes: outputArray,
        listingText,
        sourceLineMappings,
    };
}

function parseSourceLineMappings(listingText, loadAddress) {
    const mappings = [];
    let sourceLineNumber = 0;

    for (const line of listingText.split(/\r?\n/)) {
        const record = /^([0-9A-Fa-f]{6})([rR\s])\s+\d+\s*(.*)$/.exec(line);
        if (!record) {
            continue;
        }

        sourceLineNumber++;

        const bytesAndSource = /^((?:[0-9A-Fa-f]{2}\s+)+)(.*)$/.exec(record[3]);
        if (!bytesAndSource) {
            continue;
        }

        const byteCount = bytesAndSource[1].trim().split(/\s+/).length;
        const offset = Number.parseInt(record[1], 16) & 0xFFFF;
        const address = (loadAddress + offset) & 0xFFFF;

        mappings.push({
            address,
            lineNumber: sourceLineNumber,
            byteCount,
            sourceText: bytesAndSource[2].trimEnd(),
        });
    }

    return mappings;
}

function formatDiagnostics(diagnostics) {
    const lines = [];
    for (const [tool, streams] of Object.entries(diagnostics)) {
        appendDiagnostics(lines, `${tool} stdout`, streams.stdout);
        appendDiagnostics(lines, `${tool} stderr`, streams.stderr);
    }

    return lines.join("\n").trim();
}

function appendDiagnostics(lines, title, entries) {
    if (entries.length === 0) {
        return;
    }

    lines.push(`[${title}]`);
    lines.push(...entries);
    lines.push("");
}
