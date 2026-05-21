# AWS CLI Provisioning From Windows PowerShell

This guide reduces AWS Console work by creating the EC2 demo infrastructure from PowerShell.

The script creates:

- SSH key pair, if missing
- Security group for SSH/HTTP/HTTPS
- EC2 Ubuntu 24.04 instance
- Elastic IP attached to the instance

It does not create DNS records unless your domain is already in Route 53. For Cloudflare or another DNS provider, point the `A` record manually to the Elastic IP printed by the script.

## 1. Install AWS CLI

Install AWS CLI v2 for Windows:

<https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html>

Then close/reopen PowerShell and check:

```powershell
aws --version
```

## 2. Login To AWS

For normal IAM access keys:

```powershell
aws configure
```

For AWS IAM Identity Center/SSO:

```powershell
aws configure sso
aws sso login
```

Check access:

```powershell
aws sts get-caller-identity
```

## 3. Provision EC2

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/aws-provision-ec2.ps1 `
  -Region ap-northeast-1 `
  -InstanceName proposal-management-demo `
  -InstanceType t3.small `
  -VolumeSizeGb 40
```

The script auto-detects your current public IP and opens SSH only to that IP. If you want to set it manually:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/aws-provision-ec2.ps1 `
  -SshCidr "YOUR_PUBLIC_IP/32"
```

The script prints:

- Elastic IP
- SSH command
- SSH private key path

## 4. Manual DNS Step

Point your domain `A` record to the Elastic IP.

Example:

```text
your-domain.com A <Elastic IP>
```

Wait until:

```powershell
nslookup your-domain.com
```

returns the Elastic IP.

## 5. Deploy App

SSH to EC2 using the command printed by the provisioning script:

```powershell
ssh -i "$HOME\.ssh\proposal-management-demo" ubuntu@<Elastic IP>
```

Then follow [aws-ec2-deploy.md](aws-ec2-deploy.md) from the "Server Setup" section.

## Cost Control

When you are done testing, stop the instance:

```powershell
aws ec2 stop-instances --region ap-northeast-1 --instance-ids <INSTANCE_ID>
```

Elastic IP can incur cost when it is allocated but not attached to a running instance. Release it if you no longer need it:

```powershell
aws ec2 release-address --region ap-northeast-1 --allocation-id <ALLOCATION_ID>
```

## Notes

- The script assumes the selected region has a default VPC.
- `t3.small` uses x86_64 Ubuntu. If you choose `t4g.small`, the script automatically uses ARM64 Ubuntu.
- Do not expose Postgres or MinIO ports publicly.
