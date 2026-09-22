import jsonfile from "jsonfile";
import moment from "moment";
import simpleGit from "simple-git";

const path = "./data.json";
const git = simpleGit();

// Configuration for realistic contribution graph
const CONFIG = {
    year: 2026,
    startDate: "2026-01-01",
    endDate: "2026-12-31",

    // Weekend settings: do not fill weekend days (Saturday & Sunday)
    skipWeekends: true, // If true, weekend days will never receive any commits
    weekdayActivityProbability: 0.60, // 60% chance on Mon-Fri (~40% empty days)
    weekendActivityProbability: 0.0, // 0% chance on Sat-Sun (completely empty)

    // Distribution of commit count on active days to get all shades of green
    getCommitsCount() {
        const rand = Math.random();
        if (rand < 0.55) {
            // Light day (1 - 2 commits) -> Level 1 green
            return getRandomInt(1, 2);
        } else if (rand < 0.85) {
            // Moderate day (3 - 5 commits) -> Level 2/3 green
            return getRandomInt(3, 5);
        } else {
            // Peak day (6 - 10 commits) -> Level 4 bright green
            return getRandomInt(6, 10);
        }
    }
};

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate realistic timestamps sorted across waking hours (9am - 10pm)
const generateTimestampsForDay = (currentDate, count) => {
    const times = [];
    for (let i = 0; i < count; i++) {
        const hour = getRandomInt(9, 22);
        const minute = getRandomInt(0, 59);
        const second = getRandomInt(0, 59);
        times.push(currentDate.clone().hour(hour).minute(minute).second(second));
    }
    // Sort chronologically within the day
    times.sort((a, b) => a.valueOf() - b.valueOf());
    return times.map(t => t.format());
};

const run = async () => {
    const startDate = moment(CONFIG.startDate);
    const endDate = moment(CONFIG.endDate);
    let currentDate = startDate.clone();

    let totalDays = 0;
    let activeDays = 0;
    let emptyDays = 0;
    let totalCommits = 0;

    console.log(`Starting realistic contribution generator for ${CONFIG.year}...`);
    console.log(`Date range: ${CONFIG.startDate} -> ${CONFIG.endDate}`);

    while (currentDate.isSameOrBefore(endDate)) {
        totalDays++;
        const isWeekend = (currentDate.day() === 0 || currentDate.day() === 6);

        // Never fill weekend days (Saturday & Sunday)
        if (isWeekend && CONFIG.skipWeekends) {
            emptyDays++;
            if (totalDays % 30 === 0) {
                console.log(`Progress: Evaluated ${totalDays} days (${activeDays} active, ${emptyDays} empty, ${totalCommits} commits)...`);
            }
            currentDate.add(1, "day");
            continue;
        }

        const probability = isWeekend
            ? CONFIG.weekendActivityProbability
            : CONFIG.weekdayActivityProbability;

        const willCommitToday = Math.random() < probability;

        if (willCommitToday) {
            activeDays++;
            const commitCount = CONFIG.getCommitsCount();
            const timestamps = generateTimestampsForDay(currentDate, commitCount);

            for (const dateStr of timestamps) {
                const data = { date: dateStr };
                jsonfile.writeFileSync(path, data);
                await git.add([path]);
                await git.commit(dateStr, { "--date": dateStr });
                totalCommits++;
            }
        } else {
            emptyDays++;
        }

        if (totalDays % 30 === 0) {
            console.log(`Progress: Evaluated ${totalDays} days (${activeDays} active, ${emptyDays} empty, ${totalCommits} commits)...`);
        }

        currentDate.add(1, "day");
    }

    console.log("\n==========================================");
    console.log("Generation Summary:");
    console.log(`  Total Days Evaluated : ${totalDays}`);
    console.log(`  Active Days          : ${activeDays} (${Math.round((activeDays / totalDays) * 100)}%)`);
    console.log(`  Empty Days (Blank)   : ${emptyDays} (${Math.round((emptyDays / totalDays) * 100)}%)`);
    console.log(`  Total Commits Made   : ${totalCommits}`);
    console.log("==========================================\n");

    console.log("Pushing new commit history to GitHub...");
    await git.push("origin", "main", ["--force"]);
    console.log("Push complete! Your GitHub graph will update shortly without the solid fill.");
};

run().catch(console.error);
