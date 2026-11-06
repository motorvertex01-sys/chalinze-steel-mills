param(
  [Parameter(Mandatory = $true)][string]$SourceBucket,
  [Parameter(Mandatory = $true)][string]$BackupDirectory
)

$ErrorActionPreference = "Stop"
if (-not $env:R2_S3_ENDPOINT -or -not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
  throw "Set R2_S3_ENDPOINT and least-privilege AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY in the private environment."
}

$destination = [System.IO.Path]::GetFullPath($BackupDirectory)
if (Test-Path -LiteralPath $destination) {
  if ((Get-ChildItem -LiteralPath $destination -Force | Measure-Object).Count -gt 0) {
    throw "Backup destination must be a new or empty directory; existing data will not be overwritten."
  }
} else {
  New-Item -ItemType Directory -Path $destination | Out-Null
}

& aws s3 sync "s3://$SourceBucket" $destination --endpoint-url $env:R2_S3_ENDPOINT --no-progress
if ($LASTEXITCODE -ne 0) { throw "R2 download failed (aws exit code $LASTEXITCODE)." }

$files = @(Get-ChildItem -LiteralPath $destination -File -Recurse | ForEach-Object {
  [pscustomobject]@{
    key = $_.FullName.Substring($destination.TrimEnd("\").Length).TrimStart("\", "/").Replace("\", "/")
    size = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
})
$manifest = [pscustomobject]@{
  format = 1
  createdAt = [DateTime]::UtcNow.ToString("o")
  sourceBucket = $SourceBucket
  files = @($files)
}
$manifestPath = Join-Path $destination "r2-manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Output "Backed up $($files.Count) R2 objects. Copy this directory to independent storage and retain the manifest."
