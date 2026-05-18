param(
  [string]$ArtDir = (Join-Path $PSScriptRoot "..\public\category-art")
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class CategoryArtBackgroundCleaner
{
    private static bool IsBackground(byte b, byte g, byte r, byte a)
    {
        if (a < 8) return true;
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        int avg = (r + g + b) / 3;
        return avg >= 226 && (max - min) <= 16;
    }

    public static void Clean(string path)
    {
        using (var source = new Bitmap(path))
        using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(bitmap))
        {
            graphics.DrawImage(source, 0, 0, source.Width, source.Height);

            int width = bitmap.Width;
            int height = bitmap.Height;
            var rect = new Rectangle(0, 0, width, height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            int bytes = Math.Abs(stride) * height;
            byte[] pixels = new byte[bytes];
            Marshal.Copy(data.Scan0, pixels, 0, bytes);

            bool[] visited = new bool[width * height];
            var queue = new Queue<int>();

            Action<int, int> add = (x, y) =>
            {
                if (x < 0 || y < 0 || x >= width || y >= height) return;
                int index = y * width + x;
                if (visited[index]) return;
                int offset = y * stride + x * 4;
                if (IsBackground(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]))
                {
                    visited[index] = true;
                    queue.Enqueue(index);
                }
            };

            for (int x = 0; x < width; x++)
            {
                add(x, 0);
                add(x, height - 1);
            }

            for (int y = 0; y < height; y++)
            {
                add(0, y);
                add(width - 1, y);
            }

            while (queue.Count > 0)
            {
                int index = queue.Dequeue();
                int x = index % width;
                int y = index / width;
                int offset = y * stride + x * 4;
                pixels[offset] = 255;
                pixels[offset + 1] = 255;
                pixels[offset + 2] = 255;
                pixels[offset + 3] = 0;

                add(x + 1, y);
                add(x - 1, y);
                add(x, y + 1);
                add(x, y - 1);
            }

            Marshal.Copy(pixels, 0, data.Scan0, bytes);
            bitmap.UnlockBits(data);

            string tempPath = path + ".tmp.png";
            bitmap.Save(tempPath, ImageFormat.Png);
            File.Copy(tempPath, path, true);
            File.Delete(tempPath);
        }
    }
}
'@

Get-ChildItem -LiteralPath $ArtDir -Filter *.png | ForEach-Object {
  [CategoryArtBackgroundCleaner]::Clean($_.FullName)
  Write-Output "cleaned $($_.Name)"
}
