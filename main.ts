import { config } from "dotenv"
import { spawn } from "node:child_process"
import path from "node:path"

config({
  path: path.resolve(process.cwd(), ".env.local"),
})

function readIntArg(name: string, defaultValue: number) {
  const prefix = `--${name}=`
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix))

  if (inlineArg) {
    const value = Number(inlineArg.slice(prefix.length))

    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid --${name}. Expected a non-negative integer.`)
    }

    return value
  }

  const index = process.argv.indexOf(`--${name}`)

  if (index !== -1) {
    const rawValue = process.argv[index + 1]
    const value = Number(rawValue)

    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid --${name}. Expected a non-negative integer.`)
    }

    return value
  }

  return defaultValue
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(" ")}\n`)

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
      },
    })

    child.on("error", reject)

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `Command failed with exit code ${code}: ${command} ${args.join(" ")}`
          )
        )
      }
    })
  })
}

async function main() {
  const requiredEnv = [
    "DB_HOST",
    "DB_USER",
    "DB_PASS",
    "DB_NAME",
    "DATABASE_URL",
    "OPEN_WEATHER_MAP_API_KEY",
  ]

  const missing = requiredEnv.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables from .env.local: ${missing.join(", ")}`
    )
  }

  const pastDays = readIntArg("past-days", 3)
  const forecastDays = readIntArg("forecast-days", 4)

  await runCommand("npm", ["run", "migrate-up"])

  // 2a. Insert locations
  await runCommand("npx", [
    "tsx",
    "./scripts/insert-locations.ts",
  ])

  // 2b. Insert/update observations (this is the weather data)
  await runCommand("npx", [
    "tsx",
    "./scripts/insert-observations.ts",
    "--past-days",
    String(pastDays),
    "--forecast-days",
    String(forecastDays),
  ])


  await runCommand("npm", ["run", "build"])

  console.log("\nDone. Static export should be available in ./out\n")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
