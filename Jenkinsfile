pipeline {
    agent { label "MCSRND04" }

    environment {
        REGISTRY_URL = "http://172.17.145.16:4873"
        NPM_USER = "superuser"
        NPM_PASS = "jenkins!build2021"
        NPM_EMAIL = "rnd@modulusgroup.eu"
    }

    stages {

        stage("Checkout") {
            steps {
                checkout scm
            }
        }

        stage("Set Version Number") {
            steps {
                withEnv(["VERSION_INFO=$AssemblyVersion.$BUILD_NUMBER"]) {
                    bat "powershell.exe -NonInteractive -ExecutionPolicy Bypass -Command \"\$ErrorActionPreference='Stop';[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;\". '.\\SetVersion.ps1'\";EXIT \$global:LastExitCode\" "
                }
            }
        }

        stage("Install Dependencies") {
            steps {
                bat "npm install -g npm-cli-login"
                bat "npm-cli-login -r %REGISTRY_URL% -u %NPM_USER% -p %NPM_PASS% -e %NPM_EMAIL%"
                bat "npm install --registry %REGISTRY_URL%"
                bat "npm logout --registry %REGISTRY_URL%"
                bat "npm install"
            }
        }

        stage("Build Applications") {
            steps {
                bat "npm run build:all"
            }
        }

        stage("Prepare Dist Folder") {
            steps {
                bat """
                    mkdir dist\\joas-stims-open-content
                    move dist\\landing-page dist\\joas-stims-open-content\\landing-page
                    move dist\\widget dist\\joas-stims-open-content\\widget
                    xcopy /Y package.json dist\\joas-stims-open-content\\
                """
            }
        }

        stage("Create 7z Archive") {
            steps {
                dir('dist/joas-stims-open-content') {
                    bat "\"C:/Program Files/7-Zip/7z.exe\" a JOASTIMOPENCONTENT.%AssemblyVersion%.%BUILD_NUMBER%.7z *.* -r -t7z -aoa"
                }
            }
        }

        stage("Expose Artifact") {
            steps {
                archiveArtifacts artifacts: 'dist/joas-stims-open-content/*.7z', fingerprint: true
            }
        }

        stage("Push NPM package") {
            steps {
                dir('dist/joas-stims-open-content') {
                    bat "npm install -g npm-cli-login"
                    bat "npm-cli-login -r %REGISTRY_URL% -u %NPM_USER% -p %NPM_PASS% -e %NPM_EMAIL%"
                    bat "npm publish --registry %REGISTRY_URL%"
                    bat "npm logout --registry %REGISTRY_URL%"
                }
            }
        }

        stage("Tag sources") {
            steps {
                script {
                    withEnv(["GITTAG=v${AssemblyVersion}.${BUILD_NUMBER}"]) {
                        withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'jenkins-bitbucket-common-creds', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
                            String repo = env.GIT_URL.replace('https://', '')
                            bat "git restore & git tag %GITTAG%"
                            bat "git push https://${env.GIT_USERNAME}:${env.GIT_PASSWORD}@${repo} %GITTAG%"
                        }
                    }
                }
            }
        }
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }
}
