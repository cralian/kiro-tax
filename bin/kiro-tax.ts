#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { KiroTaxStack } from '../lib/kiro-tax-stack';
import { CertificateStack } from '../lib/certificate-stack';

const app = new cdk.App();

const certStack = new CertificateStack(app, 'TaxicCertStack', {
  env: { region: 'us-east-1' },
  crossRegionReferences: true,
});

new KiroTaxStack(app, 'TaxicStack', {
  env: { region: 'eu-west-2' },
  crossRegionReferences: true,
  certificate: certStack.certificate,
});
