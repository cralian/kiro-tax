import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';

interface TaxicStackProps extends cdk.StackProps {
  certificate: acm.ICertificate;
}

export class KiroTaxStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TaxicStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'TaxicBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'TaxicDistribution', {
      defaultBehavior: { origin: origins.S3BucketOrigin.withOriginAccessControl(bucket) },
      defaultRootObject: 'index.html',
      domainNames: ['tax.pilkrow.com'],
      certificate: props.certificate,
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3deploy.BucketDeployment(this, 'TaxicDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'frontend', 'dist'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
