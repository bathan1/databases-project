# Static Weather Dashboard Generator
The primary deliverable is a single command line tool that does 3 things:
Sets up your MySQL database with the necessary migrations
Pulls the OpenWeather API data into said database
Builds the Weather Map dashboard from the database data

The final output is the static dashboard site.

This is a Node.js based project, so at a minimum, you will need:
Node.js version 22.19.0
Npm package manager

Then the steps to generate the content is as follows:

1. Clone the repository at: bathan1/databases-project

2. Install dependencies:

```bash
npm install
```

Optionally you can spin up the MySQL Docker container:

```bash
npm run docker-up
```

3. Load in environment variables into `.env.local`. You will need to get an open weather map api key. If you are using the Docker container, then
the below environment config will work for development.

```txt
OPEN_WEATHER_MAP_API_KEY=
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=mydb
DATABASE_URL=mysql://root:password@localhost:3306/mydb
```

4. Run the content generation script:

```bash
npm run generate
```

By default, the script will fetch data from the past *3* days and the
next *4* days. You can change these values by passing in the number of days
into the arguments `--past-days` and `--forecast-days`:

```bash
# Give me weather data from the last 1 day and the next 2 days including today
npm run generate --past-days 1 --forecast-days 2
```

If everything went all right, then Next.js should have generated your static output at `./out`.
You can preview the build by running:

`npm run start`

And that's it!

