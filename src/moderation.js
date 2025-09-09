const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const DatabaseHandler = require("./database");

class ModerationHandler {
  constructor() {
    this.database = new DatabaseHandler();
    this.offensiveWords = [
      "adolf hitler",
      "ADOLF HITLER",
      "anal",
      "ass-fucker",
      "ASS-FUCKER",
      "assfucker",
      "ASSFUCKER",
      "assfukka",
      "ASSFUKKA",
      "ballbag",
      "BALLBAG",
      "ballsack",
      "BALLSACK",
      "bastard",
      "BASTARD",
      "beastial",
      "BEASTIAL",
      "beastiality",
      "BEASTIALITY",
      "bestial",
      "BESTIAL",
      "bestiality",
      "BESTIALITY",
      "bitchers",
      "BITCHERSblow job",
      "BLOW JOB",
      "blowjob",
      "BLOWJOB",
      "blowjobs",
      "BLOWJOBS",
      "boiolas",
      "BOIOLAS",
      "boner",
      "BONER",
      "buceta",
      "BUCETA",
      "bugger",
      "BUGGER",
      "bunny fucker",
      "BUNNY FUCKER",
      "butfuck",
      "BUTFUCK",
      "butfucker",
      "BUTFUCKER c0ck",
      "butthole",
      "BUTTHOLE",
      "buttmuch",
      "BUTTMUCH",
      "buttplug",
      "BUTTPLUG",
      "C0CK",
      "c0cksucker",
      "C0CKSUCKER",
      "carpet muncher",
      "CARPET MUNCHER",
      "cawk",
      "CAWK",
      "chink",
      "CHINK",
      "cipa",
      "CIPA",
      "cl1t",
      "CL1T",
      "clit",
      "CLIT",
      "clitoris",
      "CLITORIS",
      "clits",
      "CLITS",
      "cnut",
      "CNUT",
      "cock",
      "COCK",
      "cock-sucker",
      "COCK-SUCKER",
      "cockface",
      "COCKFACE",
      "cockhead",
      "COCKHEAD",
      "cockmunch",
      "COCKMUNCH",
      "cockmuncher",
      "COCKMUNCHER",
      "cocks",
      "COCKS",
      "cocksuck",
      "COCKSUCK",
      "cocksucked",
      "COCKSUCKED",
      "cocksucker",
      "COCKSUCKER",
      "cocksucking",
      "COCKSUCKING",
      "cocksucks",
      "COCKSUCKS",
      "cocksuka",
      "COCKSUKA",
      "cocksukka",
      "COCKSUKKA",
      "cok",
      "COK",
      "cokmuncher",
      "COKMUNCHER",
      "coksucka",
      "COKSUCKA",
      "coon",
      "COON",
      "cox",
      "COX",
      "cum",
      "CUM",
      "cummer",
      "CUMMER",
      "cumming",
      "CUMMING",
      "cums",
      "CUMS",
      "cumshot",
      "CUMSHOT",
      "cunilingus",
      "CUNILINGUS",
      "cunillingus",
      "CUNILLINGUS",
      "cunnilingus",
      "CUNNILINGUS",
      "cuntlick",
      "CUNTLICK",
      "cuntlicker",
      "CUNTLICKER",
      "cuntlicking",
      "CUNTLICKING",
      "cunts",
      "CUNTS",
      "cyalis",
      "CYALIS",
      "cyberfuc",
      "CYBERFUC",
      "cyberfuck",
      "CYBERFUCK",
      "cyberfucked",
      "CYBERFUCKED",
      "cyberfucker",
      "CYBERFUCKER",
      "cyberfuckers",
      "CYBERFUCKERS",
      "cyberfucking",
      "CYBERFUCKING",
      "d!ck",
      "D!CK dildo",
      "d1ck",
      "D1Ck",
      "dick",
      "DICK",
      "DILDO",
      "dildos",
      "DILDOS",
      "dink",
      "DINK",
      "dinks",
      "DINKS",
      "dirsa",
      "DIRSA",
      "dlck",
      "DLCK",
      "dog-fucker",
      "DOG-FUCKER",
      "doggin",
      "DOGGIN",
      "dogging",
      "DOGGING",
      "donkeyribber",
      "DONKEYRIBBER",
      "dyke",
      "DYKE",
      "ejaculate",
      "EJACULATE",
      "ejaculated",
      "EJACULATED",
      "ejaculates",
      "EJACULATES",
      "ejaculating",
      "EJACULATING",
      "ejaculatings",
      "EJACULATINGS",
      "ejaculation",
      "EJACULATION",
      "ejakulate",
      "EJAKULATE",
      "f4nny",
      "F4NNY",
      "fag",
      "FAG",
      "fagging",
      "FAGGING",
      "faggitt",
      "FAGGITT",
      "faggot",
      "FAGGOT",
      "faggs",
      "FAGGS",
      "fagot",
      "FAGOT",
      "fagots",
      "FAGOTS",
      "fags",
      "FAGS",
      "fanny",
      "FANNY",
      "fannyflaps",
      "FANNYFLAPS",
      "fannyfucker",
      "FANNYFUCKER",
      "fanyy",
      "FANYY",
      "fatass",
      "FATASS",
      "f*ck",
      "F*CK",
      "fcuk",
      "FCUK",
      "fcuker",
      "FCUKER",
      "fcuking",
      "FCUKING",
      "feck",
      "FECK",
      "fecker",
      "FECKER",
      "felching",
      "FELCHING",
      "fellate",
      "FELLATE",
      "fellatio",
      "FELLATIO",
      "fingerfuck",
      "FINGERFUCK",
      "fingerfucked",
      "FINGERFUCKED",
      "fingerfucker",
      "FINGERFUCKER",
      "fingerfuckers",
      "FINGERFUCKERS",
      "fingerfucking",
      "FINGERFUCKING",
      "fingerfucks",
      "FINGERFUCKS",
      "fistfuck",
      "FISTFUCK",
      "fistfucked",
      "FISTFUCKED",
      "fistfucker",
      "FISTFUCKER",
      "fistfuckers",
      "FISTFUCKERS",
      "fistfucking",
      "FISTFUCKING",
      "fistfuckings",
      "FISTFUCKINGS",
      "fistfucks",
      "FISTFUCKS",
      "flange",
      "FLANGE",
      "fook",
      "FOOK",
      "fooker",
      "FOOKER",
      "fuckme",
      "FUCKME",
      "fucks",
      "FUCKS",
      "fuckwhit",
      "FUCKWHIT",
      "fuckwit",
      "FUCKWIT",
      "fudge packer",
      "FUDGE PACKER",
      "fudgepacker",
      "FUDGEPACKER",
      "fuk",
      "FUK",
      "fuker",
      "FUKER",
      "fukker",
      "FUKKER",
      "fukkin",
      "FUKKIN",
      "fuks",
      "FUKS",
      "fukwhit",
      "FUKWHIT",
      "fukwit",
      "FUKWIT",
      "fux",
      "FUX",
      "fux0r",
      "FUX0R",
      "gangbang",
      "GANGBANG",
      "gangbanged",
      "GANGBANGED",
      "gangbangs",
      "GANGBANGS",
      "gaylord",
      "GAYLORD",
      "gaysex",
      "GAYSEX",
      "goatse",
      "hardcoresex",
      "HARDCORESEX",
      "hentai",
      "heshe",
      "HESHE",
      "hitler",
      "HITLER",
      "hoar",
      "HOAR",
      "hoare",
      "HOARE",
      "hoer",
      "HOER",
      "homo",
      "HOMO",
      "hore",
      "HORE",
      "horniest",
      "HORNIEST",
      "horny",
      "HORNY",
      "hotsex",
      "HOTSEX",
      "HOTWETCUM",
      "https://discord",
      "https://porn",
      "https://r34",
      "https://xxx",
      "jack-off",
      "JACK-OFF",
      "jackoff",
      "JACKOFF",
      "jap",
      "JAP",
      "Je kanker moeder",
      "jerk-off",
      "JERK-OFF",
      "jism",
      "JISM",
      "jiz",
      "JIZ",
      "jizm",
      "JIZM",
      "jizz",
      "JIZZ",
      "kanker",
      "kawk",
      "KAWK",
      "kill yourself",
      "KILL YOURSELF",
      "killyourself",
      "KILLYOURSELF",
      "kkr",
      "KNOBEND",
      "knobjocky",
      "KNOBJOCKY",
      "knobjokey",
      "KNOBJOKEY",
      "kock",
      "KOCK",
      "kondum",
      "KONDUM",
      "kondums",
      "KONDUMS",
      "kum",
      "KUM",
      "kummer",
      "KUMMER",
      "kumming",
      "KUMMING",
      "kums",
      "KUMS",
      "kunilingus",
      "KUNILINGUS",
      "kusumak",
      "KUSUMAK",
      "kys",
      "KYS",
      "l3i+ch",
      "L3I+CH",
      "l3itch",
      "L3ITCH",
      "LABI",
      "labia",
      "lusting",
      "LUSTING",
      "m0f0",
      "M0F0",
      "m0fo",
      "M0FO",
      "m45terbate",
      "M45TERBATE",
      "ma5terb8",
      "MA5TERB8",
      "ma5terbate",
      "MA5TERBATE",
      "masochist",
      "MASOCHIST",
      "master-bate",
      "MASTER-BATE",
      "masterb8",
      "MASTERB8",
      "masterbat*",
      "MASTERBAT*",
      "masterbat3",
      "MASTERBAT3",
      "masterbate",
      "MASTERBATE",
      "masterbation",
      "MASTERBATION",
      "masterbations",
      "MASTERBATIONS",
      "masturbate",
      "MASTURBATE",
      "milf",
      "MILF",
      "muff",
      "n1gga",
      "N1GGA",
      "n1gger",
      "N1GGER",
      "nazi",
      "NAZI",
      "nickher",
      "NICKHER nob",
      "nigg3r",
      "NIGG3R",
      "nigg4h",
      "NIGG4H",
      "nigga",
      "NIGGA",
      "niggah",
      "NIGGAH",
      "niggas",
      "NIGGAS",
      "niggaz",
      "NIGGAZ",
      "nigger",
      "NIGGER",
      "niggers",
      "NIGGERS",
      "nob jokey",
      "NOB JOKEY",
      "nobjocky",
      "NOBJOCKY",
      "nobjokey",
      "NOBJOKEY",
      "nud",
      "nutsack",
      "NUTSACK",
      "Onlyfans",
      "orgasim",
      "ORGASIM",
      "orgasims",
      "ORGASIMS",
      "orgasm",
      "ORGASM",
      "orgasms",
      "ORGASMS",
      "ovaries",
      "ovary",
      "p0rn",
      "P0RN",
      "pawn",
      "PAWN",
      "pecker",
      "PECKER",
      "penis",
      "PENIS",
      "penisfucker",
      "PENISFUCKER",
      "phonesex",
      "PHONESEX",
      "pigfucker",
      "PIGFUCKER",
      "pimpis",
      "PIMPIS",
      "pissflaps",
      "PISSFLAPS",
      "porn",
      "PORN",
      "porno",
      "PORNO",
      "pornography",
      "PORNOGRAPHY",
      "pornos",
      "PORNOS",
      "pron",
      "PRON",
      "prostitutes",
      "pube",
      "PUBE",
      "retard",
      "RETARD",
      "rimjaw",
      "RIMJAW",
      "rimming",
      "RIMMING",
      "s.o.b.",
      "S.O.B.",
      "sadist",
      "SADIST",
      "schlong",
      "screwing",
      "SCREWING",
      "scroat",
      "SCROAT",
      "scrote",
      "SCROTE",
      "semen",
      "SEMEN",
      "sex",
      "SEX",
      "sexslaves",
      "shag",
      "SHAG",
      "shagger",
      "SHAGGER",
      "shaggin",
      "SHAGGIN",
      "shagging",
      "SHAGGING",
      "shitdick",
      "SHITDICK",
      "skank",
      "SKANK",
      "slaves",
      "slut",
      "SLUT",
      "sluts",
      "SLUTS",
      "smegma",
      "SMEGMA",
      "smut",
      "SMUT",
      "snatch",
      "SNATCH",
      "Solara*",
      "SPAC",
      "spunk",
      "SPUNK",
      "testical",
      "TESTICAL",
      "testicle",
      "TITFUC",
      "titfuck",
      "tittiefucker",
      "TITTIEFUCKER",
      "tittyfuck",
      "TITTYFUCK",
      "tittywank",
      "TITTYWANK",
      "titwank",
      "TITWANK",
      "tosser",
      "TOSSER",
      "twatty",
      "TWATTY",
      "twunt",
      "TWUNT",
      "twunter",
      "TWUNTER",
      "underagesex",
      "v14gra",
      "V14GRA",
      "v1gra",
      "V1GRA",
      "vagina",
      "VAGINA",
      "viagra",
      "VIAGRA",
      "vulva",
      "VULVA",
      "w00se",
      "W00SE",
      "whoar",
      "WHOAR",
      "whore",
      "WHORE",
      "WILLIES",
      "xrated",
      "XRATED",
      "卍"
      // Add more offensive words as needed
    ];
    this.joinTimes = new Map();
    this.recentJoins = [];
  }

  async checkMessage(message) {
    const content = message.content.toLowerCase();

    // Check for offensive words
    for (const word of this.offensiveWords) {
      if (content.includes(word.toLowerCase())) {
        await this.handleOffensiveContent(message, word);
        return;
      }
    }

    // Check for spam (repeated messages)
    await this.checkSpam(message);

    // Check for invite links
    if (this.containsInviteLinks(content)) {
      await this.handleInviteLink(message);
    }
  }

  // async handleOffensiveContent(message, word) {
  //     const userId = message.author.id;
  //     const guildId = message.guild.id;

  //     // Get user's strike count
  //     const userData = this.database.getUserData(userId, guildId);
  //     const strikes = userData.strikes || 0;

  //     // Delete the message
  //     try {
  //         await message.delete();
  //     } catch (error) {
  //         console.error('Failed to delete message:', error);
  //     }

  //     let action = 'warn';
  //     let duration = null;

  //     if (strikes === 0) {
  //         action = 'warn';
  //         await this.warnUser(message, `Use of offensive language: "${word}"`);
  //     } else if (strikes === 1) {
  //         action = 'timeout';
  //         duration = 10 * 60 * 1000; // 10 minutes
  //         await this.timeoutUser(message, duration, `Repeated offensive language: "${word}"`);
  //     } else {
  //         action = 'ban';
  //         await this.banUser(message, `Multiple violations of offensive language rules`);
  //     }

  //     // Log the action
  //     this.database.logAction({
  //         userId: userId,
  //         guildId: guildId,
  //         action: action,
  //         reason: `Offensive language: "${word}"`,
  //         moderator: 'Barry (Auto)',
  //         timestamp: new Date().toISOString(),
  //         duration: duration
  //     });

  //     // Update user strikes
  //     this.database.updateUserStrikes(userId, guildId, strikes + 1);

  //     // Send to mod log
  //     await this.sendToModLog(message.guild, {
  //         action: action,
  //         user: message.author,
  //         reason: `Offensive language: "${word}"`,
  //         moderator: 'Barry (Auto)',
  //         strikes: strikes + 1
  //     });
  // }

  // ...existing code...
  async handleOffensiveContent(message, word) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const userData = this.database.getUserData(userId, guildId);
    const strikes = userData.strikes || 0;

    // Delete the message
    try {
      await message.delete();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }

    let action = "warn";
    let duration = null;
    let timeoutMinutes = [0, 0, 0, 2, 5, 7, 10, 15, 20, 30]; // index = strike count (4th strike = 2min, etc.)

    if (strikes < 3) {
      // 1st-3rd offense: warn
      action = "warn";
      await this.warnUser(message, `Use of offensive language: "${word}"`);
    } else if (strikes < 10) {
      // 4th-10th offense: timeout, increasing duration
      action = "timeout";
      duration = timeoutMinutes[strikes] * 60 * 1000;
      await this.timeoutUser(
        message,
        duration,
        `Repeated offensive language: "${word}"`
      );
    } else {
      // 11th offense and above: notify moderators
      action = "notify_mods";
      const modChannel = await this.getModChannel(message.guild);
      if (modChannel) {
        await modChannel.send({
          content: `@here Moderators, user ${message.author} (${message.author.tag}, ID: ${message.author.id}) has used offensive language 10+ times and should be considered for a ban.\nReason: "${word}"`,
        });
      }
      await this.warnUser(
        message,
        `You have exceeded the maximum number of warnings. Moderators have been notified.`
      );
    }

    // Log the action
    this.database.logAction({
      userId: userId,
      guildId: guildId,
      action: action,
      reason: `Offensive language: "${word}"`,
      moderator: "Barry (Auto)",
      timestamp: new Date().toISOString(),
      duration: duration,
    });

    // Update user strikes
    this.database.updateUserStrikes(userId, guildId, strikes + 1);

    // Send to mod log
    await this.sendToModLog(message.guild, {
      action: action,
      user: message.author,
      reason: `Offensive language: "${word}"`,
      moderator: "Barry (Auto)",
      strikes: strikes + 1,
    });
  }

  async warnUser(message, reason) {
    const embed = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("⚠️ Warning")
      .setDescription(`${message.author}, you've been warned for: ${reason}`)
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }

  async timeoutUser(message, duration, reason) {
    try {
      await message.member.timeout(duration, reason);

      const embed = new EmbedBuilder()
        .setColor(0xff8c00)
        .setTitle("🔇 User Timed Out")
        .setDescription(
          `${message.author} has been timed out for ${
            duration / 60000
          } minutes.\nReason: ${reason}`
        )
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to timeout user:", error);
    }
  }

  async banUser(message, reason) {
    try {
      await message.member.ban({ reason: reason });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("🔨 User Banned")
        .setDescription(
          `${message.author.tag} has been banned.\nReason: ${reason}`
        )
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  }

  async checkSpam(message) {
    const userId = message.author.id;
    const content = message.content;

    // Simple spam detection - same message repeated
    const userData = this.database.getUserData(userId, message.guild.id);
    if (userData.lastMessage === content && userData.lastMessageTime) {
      const timeDiff = Date.now() - userData.lastMessageTime;
      if (timeDiff < 5000) {
        // Same message within 5 seconds
        await this.handleSpam(message);
        return;
      }
    }

    // Update last message
    this.database.updateUserData(userId, message.guild.id, {
      lastMessage: content,
      lastMessageTime: Date.now(),
    });
  }

  async handleSpam(message) {
    await message.delete();
    await this.warnUser(message, "Spam detected");

    this.database.logAction({
      userId: message.author.id,
      guildId: message.guild.id,
      action: "warn",
      reason: "Spam detected",
      moderator: "Barry (Auto)",
      timestamp: new Date().toISOString(),
    });
  }

  containsInviteLinks(content) {
    const inviteRegex =
      /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
    return inviteRegex.test(content);
  }

  async handleInviteLink(message) {
      // Check if user has permission to post invites
      if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return; // Allow mods to post invites
      }

      const userId = message.author.id;
      const guildId = message.guild.id;
      const userData = this.database.getUserData(userId, guildId);
      const inviteStrikes = userData.inviteStrikes || 0;

      // Delete the message
      try {
        await message.delete();
      } catch (error) {
        console.error("Failed to delete invite message:", error);
      }

      let action = "warn";
      let duration = null;

      if (inviteStrikes === 0) {
        action = "warn";
        await this.warnUser(message, "Posting Discord server invites is not allowed. This is your first warning.");
      } else if (inviteStrikes === 1) {
        action = "timeout";
        duration = 1 * 60 * 1000;
        await this.timeoutUser(message, duration, "Second time posting Discord server invite. You are timed out for 1 minute.");
      } else if (inviteStrikes === 2) {
        action = "timeout";
        duration = 5 * 60 * 1000;
        await this.timeoutUser(message, duration, "Third time posting Discord server invite. You are timed out for 5 minutes.");
      } else {
        action = "ban";
        await this.banUser(message, "Repeated posting of Discord server invites. You are banned.");
      }

      // Log the action
      this.database.logAction({
        userId: userId,
        guildId: guildId,
        action: action,
        reason: "Discord server invite violation",
        moderator: "Barry (Auto)",
        timestamp: new Date().toISOString(),
        duration: duration,
      });

      // Update inviteStrikes
      this.database.updateUserData(userId, guildId, {
        inviteStrikes: inviteStrikes + 1
      });
  }

  async handleMemberJoin(member) {
    const now = Date.now();
    this.recentJoins.push(now);

    // Remove joins older than 60 seconds
    this.recentJoins = this.recentJoins.filter((time) => now - time < 60000);

    // Check for raid (5+ joins in 60 seconds)
    if (this.recentJoins.length >= 5) {
      await this.handleRaid(member.guild);
    }

    // Check for suspicious account (less than 7 days old)
    const accountAge = now - member.user.createdTimestamp;
    if (accountAge < 7 * 24 * 60 * 60 * 1000) {
      await this.flagSuspiciousJoin(member);
    }
  }

  async handleRaid(guild) {
    const modChannel = await this.getModChannel(guild);
    if (!modChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚨 Potential Raid Detected")
      .setDescription("5+ users have joined within the last 60 seconds")
      .setTimestamp();

    await modChannel.send({ embeds: [embed] });
  }

  async flagSuspiciousJoin(member) {
    const modChannel = await this.getModChannel(member.guild);
    if (!modChannel) return;

    const accountAge = Math.floor(
      (Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000)
    );

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle("⚠️ Suspicious Account Join")
      .setDescription(
        `${member.user.tag} joined with a ${accountAge} day old account`
      )
      .addFields(
        {
          name: "User",
          value: `${member.user.tag} (${member.user.id})`,
          inline: true,
        },
        {
          name: "Account Created",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setTimestamp();

    await modChannel.send({ embeds: [embed] });
  }

  async sendToModLog(guild, logData) {
    const modChannel = await this.getModChannel(guild);
    if (!modChannel) return;

    const embed = new EmbedBuilder()
      .setColor(this.getActionColor(logData.action))
      .setTitle(
        `${this.getActionEmoji(logData.action)} ${logData.action.toUpperCase()}`
      )
      .addFields(
        {
          name: "User",
          value: `${logData.user.tag} (${logData.user.id})`,
          inline: true,
        },
        { name: "Moderator", value: logData.moderator, inline: true },
        { name: "Reason", value: logData.reason, inline: false }
      )
      .setTimestamp();

    if (logData.strikes) {
      embed.addFields({
        name: "Strikes",
        value: logData.strikes.toString(),
        inline: true,
      });
    }

    await modChannel.send({ embeds: [embed] });
  }

  async getModChannel(guild) {
    let channel = guild.channels.cache.find((ch) => ch.name === "barry-mods");

    if (!channel) {
      try {
        channel = await guild.channels.create({
          name: "barry-mods",
          type: 0, // Text channel
          permissionOverwrites: [
            {
              id: guild.roles.everyone,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id:
                guild.roles.cache.find((role) =>
                  role.permissions.has(
                    PermissionsBitField.Flags.ModerateMembers
                  )
                )?.id || guild.ownerId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
          ],
        });
      } catch (error) {
        console.error("Failed to create mod channel:", error);
      }
    }

    return channel;
  }

  getActionColor(action) {
    switch (action) {
      case "warn":
        return 0xffff00;
      case "timeout":
        return 0xff8c00;
      case "ban":
        return 0xff0000;
      case "kick":
        return 0xff4500;
      default:
        return 0x0099ff;
    }
  }

  getActionEmoji(action) {
    switch (action) {
      case "warn":
        return "⚠️";
      case "timeout":
        return "🔇";
      case "ban":
        return "🔨";
      case "kick":
        return "👢";
      default:
        return "📝";
    }
  }
}

module.exports = ModerationHandler;
