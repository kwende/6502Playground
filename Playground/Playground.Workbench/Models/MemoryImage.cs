namespace Playground.Workbench.Models;

public sealed class MemoryImage
{
    public const int Size = 0x10000;

    private readonly byte[] _bytes = new byte[Size];
    private readonly HashSet<int> _changedAddresses = [];

    public MemoryImage(byte fillValue = 0x00)
    {
        Fill(fillValue);
    }

    public IReadOnlySet<int> ChangedAddresses => _changedAddresses;

    public byte GetByte(int address) => _bytes[NormalizeAddress(address)];

    public byte[] ToArray()
    {
        var copy = new byte[Size];
        Array.Copy(_bytes, copy, Size);
        return copy;
    }

    public void SetByte(int address, byte value, bool markChanged = true)
    {
        var normalizedAddress = NormalizeAddress(address);
        _bytes[normalizedAddress] = value;

        if (markChanged)
        {
            _changedAddresses.Add(normalizedAddress);
        }
    }

    public void Load(ushort startAddress, IReadOnlyList<byte> bytes)
    {
        ArgumentNullException.ThrowIfNull(bytes);

        for (var index = 0; index < bytes.Count; index++)
        {
            SetByte(startAddress + index, bytes[index]);
        }
    }

    public void Fill(byte value)
    {
        Array.Fill(_bytes, value);
        _changedAddresses.Clear();
    }

    public void Replace(IReadOnlyList<byte> bytes, IEnumerable<int>? changedAddresses = null)
    {
        ArgumentNullException.ThrowIfNull(bytes);

        if (bytes.Count != Size)
        {
            throw new ArgumentException($"Memory snapshots must contain exactly {Size} bytes.", nameof(bytes));
        }

        for (var index = 0; index < Size; index++)
        {
            _bytes[index] = bytes[index];
        }

        _changedAddresses.Clear();
        if (changedAddresses is null)
        {
            return;
        }

        foreach (var address in changedAddresses)
        {
            _changedAddresses.Add(NormalizeAddress(address));
        }
    }

    public void ClearChangeMarks() => _changedAddresses.Clear();

    private static int NormalizeAddress(int address) => address & 0xFFFF;
}
