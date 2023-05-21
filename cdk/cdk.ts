#!/usr/bin/env node
import "./env";
import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AwsLogDriver, Cluster, ContainerImage, FargateTaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Repository } from "aws-cdk-lib/aws-ecr";

const app = new App();

const region = 'us-east-1'
const awsAccount = '<your aws account>'
const ecrRepoName = 'nextjs'

const props = {
  env: {
    region,
    account: awsAccount,
  },
};

/**
 * Backend Stack deploys Nodejs application as Lambda and create's a Rest Api
 */
class BackendStack extends Stack {
  public lambdaRestApi: LambdaRestApi;
  constructor(scope: Construct, id: string, props: StackProps) {
      super(scope, id, props);

    const taskRole = new Role(this, "fargate-test-task-role", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
      
       // Create an ECR repository
    const ecrRepository = Repository.fromRepositoryName(this, 'MyECRRepository', 
      ecrRepoName
    );

    // Define a fargate task with the newly created execution and task roles
    const taskDefinition = new FargateTaskDefinition(
      this,
      "fargate-task-definition",
      {
        taskRole: taskRole,
        executionRole: taskRole,
      }
    );

    // Import a local docker image and set up logger
    const container = taskDefinition.addContainer(
      "fargate-test-task-container",
      {
        image: ContainerImage.fromEcrRepository(ecrRepository, 'latest'),
        logging: new AwsLogDriver({
          streamPrefix: "fargate-test-task-log-prefix",
        }),
      }
    );

    container.addPortMappings({
      containerPort: 80,
      hostPort: 80,
    });

    // NOTE: I've been creating a new VPC in us-east-2 (Ohio) to keep it clean, so se that at the top in stackProps
    // Create a vpc to hold everything - this creates a brand new vpc
    // Remove this if you are using us-east-1 and the existing non-prod vpc as commented out below
    const vpc = new Vpc(this, "vpc");

    // Create the cluster
    const cluster = new Cluster(this, "fargate-test-task-cluster", { vpc });

    // Create a load-balanced Fargate service and make it public
    new ApplicationLoadBalancedFargateService(
      this,
      "MyFargateService",
      {
        cluster: cluster, // Required
        cpu: 512, // Default is 256
        desiredCount: 2, // Default is 1
        taskDefinition: taskDefinition,
        memoryLimitMiB: 2048, // Default is 512
        publicLoadBalancer: true, // Default is false
      }
    );
    
  }
}


/**
 * Create a instance of Backend and Frontend Stack
 */
new BackendStack(app, "backend", props);
