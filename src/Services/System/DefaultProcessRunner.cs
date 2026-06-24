using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace WinHome.Services.System
{
    public class DefaultProcessRunner
    {
        public async Task<int> RunProcessAsync(string fileName, string arguments, TimeSpan? customTimeout = null)
        {
            TimeSpan timeout = customTimeout ?? TimeSpan.FromMinutes(10); // Configurable, defaults to 10 mins

            var processStartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (var process = new Process { StartInfo = processStartInfo })
            {
                process.Start();

                // Setup cancellation token for timeout
                using (var cts = new CancellationTokenSource(timeout))
                {
                    try
                    {
                        // Periodically report status while waiting for the process to exit
                        var statusTask = Task.Run(async () =>
                        {
                            Stopwatch sw = Stopwatch.StartNew();
                            while (!process.HasExited && !cts.IsCancellationRequested)
                            {
                                await Task.Delay(5000, cts.Token); // Log every 5 seconds
                                Console.WriteLine($"[ProcessRunner] '{fileName}' is still running... (Elapsed: {sw.Elapsed.ToString(@"mm\:ss")})");
                            }
                        }, cts.Token);

                        // Wait for the process to complete or timeout
                        await process.WaitForExitAsync(cts.Token);
                        return process.ExitCode;
                    }
                    catch (OperationCanceledException)
                    {
                        // Timeout reached, kill process gracefully
                        Console.WriteLine($"[ProcessRunner] Error: Process '{fileName}' exceeded the timeout of {timeout.TotalMinutes} minutes and was terminated.");
                        if (!process.HasExited)
                        {
                            process.Kill(true);
                        }
                        throw new TimeoutException($"Process '{fileName}' timed out after {timeout.TotalMinutes} minutes.");
                    }
                }
            }
        }
    }
}
