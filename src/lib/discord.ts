export async function sendDiscordWebhook(webhookUrl: string, payload: any) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Discord Webhook failed: ${res.status} ${res.statusText}`);
  }

  return true;
}

export async function sendTestNotification(webhookUrl: string, username: string) {
  const payload = {
    username: "DevTrack Bot",
    avatar_url: "https://github.com/Priyanshu-byte-coder.png", // Or a devtrack logo
    embeds: [
      {
        title: "✅ Discord Integration Successful!",
        description: `Hello **${username}**, your Discord webhook has been successfully linked to DevTrack. You will now receive streak reminders and milestone alerts here.`,
        color: 3900150, // Blue
        footer: {
          text: "DevTrack Notifications",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, payload);
}

export async function sendStreakAtRisk(webhookUrl: string, username: string, currentStreak: number) {
  const payload = {
    username: "DevTrack Bot",
    embeds: [
      {
        title: "⚠️ Streak at Risk!",
        description: `Hey **${username}**, you haven't made any commits today! Your current streak is **${currentStreak} days**. Commit now before midnight to keep it alive!`,
        color: 16750848, // Orange
        footer: {
          text: "DevTrack Streak Reminder",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, payload);
}

export async function sendMilestoneReached(webhookUrl: string, username: string, streak: number) {
  const payload = {
    username: "DevTrack Bot",
    embeds: [
      {
        title: "🎉 Milestone Reached!",
        description: `Incredible work, **${username}**! You've just hit a **${streak}-day** commit streak! Keep up the amazing consistency! 🚀`,
        color: 16761095, // Gold
        thumbnail: {
          url: "https://github.githubassets.com/images/modules/profile/achievements/pull-shark-default.png", // Just a placeholder fun image
        },
        footer: {
          text: "DevTrack Milestone",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, payload);
}

export async function sendWeeklySummary(webhookUrl: string, username: string, stats: { commits: number; prs: number; activeDays: number }) {
  const payload = {
    username: "DevTrack Bot",
    embeds: [
      {
        title: "📊 Weekly Summary",
        description: `Here is your coding activity summary for the past week, **${username}**:`,
        color: 5814783, // Purple-ish
        fields: [
          {
            name: "Commits",
            value: `${stats.commits}`,
            inline: true,
          },
          {
            name: "Pull Requests",
            value: `${stats.prs}`,
            inline: true,
          },
          {
            name: "Active Days",
            value: `${stats.activeDays} / 7`,
            inline: true,
          },
        ],
        footer: {
          text: "DevTrack Weekly Summary",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(webhookUrl, payload);
}
