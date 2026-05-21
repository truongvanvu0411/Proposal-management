param(
  [string]$Region = "ap-northeast-1",
  [string]$InstanceName = "proposal-management-demo",
  [string]$InstanceType = "t3.small",
  [int]$VolumeSizeGb = 40,
  [string]$KeyName = "proposal-management-demo-key",
  [string]$KeyPath = "$HOME\.ssh\proposal-management-demo",
  [string]$SecurityGroupName = "proposal-management-demo-sg",
  [string]$AmiId = "",
  [string]$SshCidr = "",
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Require-Command($CommandName, $InstallHint) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "$CommandName is not installed. $InstallHint"
  }
}

function Invoke-AwsJson([string[]]$Arguments) {
  $output = & aws @Arguments --output json
  if ($LASTEXITCODE -ne 0) {
    throw "aws $($Arguments -join ' ') failed"
  }
  if ([string]::IsNullOrWhiteSpace($output)) {
    return $null
  }
  return $output | ConvertFrom-Json
}

function Invoke-AwsText([string[]]$Arguments) {
  $output = & aws @Arguments --output text
  if ($LASTEXITCODE -ne 0) {
    throw "aws $($Arguments -join ' ') failed"
  }
  return ($output | Out-String).Trim()
}

function Invoke-AwsIgnoreDuplicate([string[]]$Arguments) {
  $output = & aws @Arguments 2>&1
  if ($LASTEXITCODE -ne 0 -and ($output -notmatch "InvalidPermission\.Duplicate")) {
    throw "aws $($Arguments -join ' ') failed: $output"
  }
}

Require-Command "aws" "Install AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
Require-Command "ssh-keygen" "Install OpenSSH Client from Windows Optional Features."

$caller = Invoke-AwsJson @("sts", "get-caller-identity", "--region", $Region)
Write-Host "[aws] Account: $($caller.Account), Arn: $($caller.Arn)"

if ([string]::IsNullOrWhiteSpace($SshCidr)) {
  try {
    $publicIp = (Invoke-WebRequest -Uri "https://checkip.amazonaws.com" -UseBasicParsing -TimeoutSec 10).Content.Trim()
    $SshCidr = "$publicIp/32"
  } catch {
    $SshCidr = "0.0.0.0/0"
    Write-Warning "Could not detect your public IP. SSH will be opened to 0.0.0.0/0 unless you pass -SshCidr."
  }
}
Write-Host "[aws] SSH CIDR: $SshCidr"

$vpcId = Invoke-AwsText @(
  "ec2", "describe-vpcs",
  "--region", $Region,
  "--filters", "Name=is-default,Values=true",
  "--query", "Vpcs[0].VpcId"
)
if ($vpcId -eq "None" -or [string]::IsNullOrWhiteSpace($vpcId)) {
  throw "No default VPC found in $Region. Create/select a VPC manually, or extend this script with VPC creation."
}
Write-Host "[aws] Default VPC: $vpcId"

$subnetId = Invoke-AwsText @(
  "ec2", "describe-subnets",
  "--region", $Region,
  "--filters", "Name=vpc-id,Values=$vpcId", "Name=default-for-az,Values=true",
  "--query", "Subnets[0].SubnetId"
)
if ($subnetId -eq "None" -or [string]::IsNullOrWhiteSpace($subnetId)) {
  $subnetId = Invoke-AwsText @(
    "ec2", "describe-subnets",
    "--region", $Region,
    "--filters", "Name=vpc-id,Values=$vpcId",
    "--query", "Subnets[0].SubnetId"
  )
}
Write-Host "[aws] Subnet: $subnetId"

$keyDirectory = Split-Path -Parent $KeyPath
if (-not (Test-Path $keyDirectory)) {
  New-Item -ItemType Directory -Path $keyDirectory | Out-Null
}
if (-not (Test-Path $KeyPath)) {
  Write-Host "[ssh] Generating SSH key at $KeyPath"
  $sshKeygenArgs = @("-t", "ed25519", "-f", $KeyPath, "-N", "", "-C", $KeyName)
  & ssh-keygen @sshKeygenArgs | Out-Null
}
$publicKeyPath = "$KeyPath.pub"
if (-not (Test-Path $publicKeyPath)) {
  throw "Public key not found: $publicKeyPath"
}

$existingKey = Invoke-AwsText @(
  "ec2", "describe-key-pairs",
  "--region", $Region,
  "--filters", "Name=key-name,Values=$KeyName",
  "--query", "KeyPairs[0].KeyName"
) 2>$null
if ($existingKey -eq "None" -or [string]::IsNullOrWhiteSpace($existingKey)) {
  Write-Host "[aws] Importing key pair: $KeyName"
  & aws ec2 import-key-pair `
    --region $Region `
    --key-name $KeyName `
    --public-key-material "fileb://$publicKeyPath" `
    --output json | Out-Null
} else {
  Write-Host "[aws] Key pair exists: $KeyName"
}

$securityGroupId = Invoke-AwsText @(
  "ec2", "describe-security-groups",
  "--region", $Region,
  "--filters", "Name=vpc-id,Values=$vpcId", "Name=group-name,Values=$SecurityGroupName",
  "--query", "SecurityGroups[0].GroupId"
) 2>$null
if ($securityGroupId -eq "None" -or [string]::IsNullOrWhiteSpace($securityGroupId)) {
  $securityGroupId = Invoke-AwsText @(
    "ec2", "create-security-group",
    "--region", $Region,
    "--group-name", $SecurityGroupName,
    "--description", "Proposal Management demo EC2 security group",
    "--vpc-id", $vpcId,
    "--query", "GroupId"
  )
  Write-Host "[aws] Created security group: $securityGroupId"
} else {
  Write-Host "[aws] Security group exists: $securityGroupId"
}

& aws ec2 create-tags --region $Region --resources $securityGroupId --tags "Key=Name,Value=$SecurityGroupName" | Out-Null
Invoke-AwsIgnoreDuplicate @("ec2", "authorize-security-group-ingress", "--region", $Region, "--group-id", $securityGroupId, "--protocol", "tcp", "--port", "22", "--cidr", $SshCidr)
Invoke-AwsIgnoreDuplicate @("ec2", "authorize-security-group-ingress", "--region", $Region, "--group-id", $securityGroupId, "--protocol", "tcp", "--port", "80", "--cidr", "0.0.0.0/0")
Invoke-AwsIgnoreDuplicate @("ec2", "authorize-security-group-ingress", "--region", $Region, "--group-id", $securityGroupId, "--protocol", "tcp", "--port", "443", "--cidr", "0.0.0.0/0")

if ([string]::IsNullOrWhiteSpace($AmiId)) {
  $architecture = if ($InstanceType -match "^[a-z0-9]+g\.") { "arm64" } else { "amd64" }
  $amiParameter = "/aws/service/canonical/ubuntu/server/24.04/stable/current/$architecture/hvm/ebs-gp3/ami-id"
  $AmiId = Invoke-AwsText @("ssm", "get-parameter", "--region", $Region, "--name", $amiParameter, "--query", "Parameter.Value")
}
Write-Host "[aws] AMI: $AmiId"

$existingInstance = Invoke-AwsJson @(
  "ec2", "describe-instances",
  "--region", $Region,
  "--filters", "Name=tag:Name,Values=$InstanceName", "Name=instance-state-name,Values=pending,running,stopping,stopped",
  "--query", "Reservations[].Instances[].{InstanceId:InstanceId,State:State.Name,PublicIpAddress:PublicIpAddress}"
)

if ($existingInstance.Count -gt 0) {
  $instanceId = $existingInstance[0].InstanceId
  Write-Host "[aws] Instance exists: $instanceId ($($existingInstance[0].State))"
  if (-not $NoStart -and $existingInstance[0].State -eq "stopped") {
    & aws ec2 start-instances --region $Region --instance-ids $instanceId | Out-Null
    & aws ec2 wait instance-running --region $Region --instance-ids $instanceId
  }
} else {
  Write-Host "[aws] Launching EC2 instance..."
  $instanceId = Invoke-AwsText @(
    "ec2", "run-instances",
    "--region", $Region,
    "--image-id", $AmiId,
    "--instance-type", $InstanceType,
    "--key-name", $KeyName,
    "--subnet-id", $subnetId,
    "--security-group-ids", $securityGroupId,
    "--block-device-mappings", "DeviceName=/dev/sda1,Ebs={VolumeSize=$VolumeSizeGb,VolumeType=gp3,DeleteOnTermination=true}",
    "--tag-specifications", "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName},{Key=App,Value=proposal-management-demo}]",
    "--query", "Instances[0].InstanceId"
  )
  & aws ec2 wait instance-running --region $Region --instance-ids $instanceId
}
Write-Host "[aws] Instance: $instanceId"

$allocationId = Invoke-AwsText @(
  "ec2", "describe-addresses",
  "--region", $Region,
  "--filters", "Name=tag:Name,Values=$InstanceName-eip",
  "--query", "Addresses[0].AllocationId"
) 2>$null
if ($allocationId -eq "None" -or [string]::IsNullOrWhiteSpace($allocationId)) {
  $allocationId = Invoke-AwsText @(
    "ec2", "allocate-address",
    "--region", $Region,
    "--domain", "vpc",
    "--tag-specifications", "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$InstanceName-eip},{Key=App,Value=proposal-management-demo}]",
    "--query", "AllocationId"
  )
  Write-Host "[aws] Allocated Elastic IP: $allocationId"
} else {
  Write-Host "[aws] Elastic IP exists: $allocationId"
}

$publicIp = Invoke-AwsText @(
  "ec2", "describe-addresses",
  "--region", $Region,
  "--allocation-ids", $allocationId,
  "--query", "Addresses[0].PublicIp"
)
$associatedInstance = Invoke-AwsText @(
  "ec2", "describe-addresses",
  "--region", $Region,
  "--allocation-ids", $allocationId,
  "--query", "Addresses[0].InstanceId"
)
if ($associatedInstance -ne $instanceId) {
  & aws ec2 associate-address --region $Region --instance-id $instanceId --allocation-id $allocationId --allow-reassociation | Out-Null
}

$instance = Invoke-AwsJson @(
  "ec2", "describe-instances",
  "--region", $Region,
  "--instance-ids", $instanceId,
  "--query", "Reservations[0].Instances[0].{InstanceId:InstanceId,State:State.Name,PublicIpAddress:PublicIpAddress,PublicDnsName:PublicDnsName}"
)

Write-Host ""
Write-Host "[ok] AWS resources are ready."
Write-Host "Instance ID : $($instance.InstanceId)"
Write-Host "State       : $($instance.State)"
Write-Host "Elastic IP  : $publicIp"
Write-Host "SSH key     : $KeyPath"
Write-Host ""
Write-Host "Next manual step: point your domain A record to $publicIp"
Write-Host ""
Write-Host "SSH command:"
Write-Host "ssh -i `"$KeyPath`" ubuntu@$publicIp"
