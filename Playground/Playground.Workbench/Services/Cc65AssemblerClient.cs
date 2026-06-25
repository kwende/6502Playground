using Microsoft.JSInterop;
using Playground.Workbench.Models;

namespace Playground.Workbench.Services;

public sealed class Cc65AssemblerClient : IAsyncDisposable
{
    private static readonly string ModulePath = WorkbenchStaticAssets.WithVersion("./_content/Playground.Workbench/toolchain/cc65/cc65-wrapper.js");

    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;

    public Cc65AssemblerClient(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async ValueTask<Cc65AssemblyResult> AssembleAndLinkAsync(Cc65AssemblyRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var module = await GetModuleAsync();
        return await module.InvokeAsync<Cc65AssemblyResult>("assembleAndLink", request);
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
