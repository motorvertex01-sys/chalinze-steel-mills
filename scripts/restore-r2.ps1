param(
  [Parameter(Mandatory = $true)][string]$BackupDirectory,
  [Parameter(Mandatory = $true)][string]$DestinationBucket
)

$ErrorActionPreference = "Stop"
if (-not $env:R2_S3_ENDPOINT -or -not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
  throw "Set R2_S3_ENDPOINT and least-privilege AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY in the private environment."
}

$source = [System.IO.Path]::GetFullPath($BackupDirectory)
$manifestPath = Join-Path $source "r2-manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "The R2 integrity manifest is missing." }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.format -ne 1 -or $null -eq $manifest.files) { throw "The R2 backup manifest format is invalid." }

$expected = @{}
foreach ($file in $manifest.files) { $expected[$file.key] = $file }
$actualFiles = @(Get-ChildItem -LiteralPath $source -File -Recurse | Where-Object { $_.Name -ne "r2-manifest.json" })
if ($actualFiles.Count -ne $expected.Count) { throw "R2 backup object count does not match its manifest." }
foreach ($file in $actualFiles) {
  $key = $file.FullName.Substring($source.TrimEnd("\").Length).TrimStart("\", "/").Replace("\", "/")
  if (-not $expected.ContainsKey($key) -or $file.Length -ne $expected[$key].size) {
    throw "R2 backup contains an unexpected object or size: $key"
  }
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $expected[$key].sha256) { throw "R2 backup checksum mismatch: $key" }
}

$listing = & aws s3api list-objects-v2 --bucket $DestinationBucket --endpoint-url $env:R2_S3_ENDPOINT --output json
if ($LASTEXITCODE -ne 0) { throw "Could not inspect destination bucket (aws exit code $LASTEXITCODE)." }
if ((($listing | ConvertFrom-Json).KeyCount) -gt 0) {
  throw "Destination bucket is not empty; restore refuses to overwrite objects."
}

& aws s3 sync $source "s3://$DestinationBucket" --endpoint-url $env:R2_S3_ENDPOINT --exclude "r2-manifest.json" --no-progress
if ($LASTEXITCODE -ne 0) { throw "R2 restore failed (aws exit code $LASTEXITCODE)." }
Write-Output "Restored $($expected.Count) verified objects into the empty destination bucket."
