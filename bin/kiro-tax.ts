#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { KiroTaxStack } from '../lib/kiro-tax-stack';

const app = new cdk.App();
new KiroTaxStack(app, 'TaxicStack', {
  env: { region: 'eu-west-2' },
});
