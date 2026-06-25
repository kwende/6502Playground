using Microsoft.JSInterop;
using Playground.Workbench.Models;

namespace Playground.Workbench.Services;

public sealed class M6502CpuClient : IAsyncDisposable
{
    private static readonly string ModulePath = WorkbenchStaticAssets.WithVersion("./_content/Playground.Workbench/toolchain/m6502/m6502-wrapper.js");

    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;

    public M6502CpuClient(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async ValueTask<Cpu6502ExecutionResult> StepInstructionAsync(Cpu6502ExecutionRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var module = await GetModuleAsync();
        return await module.InvokeAsync<Cpu6502ExecutionResult>("stepInstruction", request);
    }

    public async ValueTask<Cpu6502ExecutionResult> RunInstructionsAsync(Cpu6502ExecutionRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var module = await GetModuleAsync();
        return await module.InvokeAsync<Cpu6502ExecutionResult>("runInstructions", request);
    }

    private async ValueTask<IJSObjectReference> GetModuleAsync()
    {
        _module ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", ModulePath);
        return _module;
    }

    public async ValueTask DisposeAsync()
    {
        if (_module is not null)
        {
            await _module.DisposeAsync();
        }
    }
}
