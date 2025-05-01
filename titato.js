const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Game session storage
const activeGames = new Map(); // channelId -> gameSession
const pendingInvites = new Map(); // messageId -> invite

// Utility functions
const randomMove = (board) => {
    const available = board
        .map((cell, idx) => cell === null ? idx : null)
        .filter(cell => cell !== null);
    return available[Math.floor(Math.random() * available.length)];
};

function minimax(board, depth, isMaximizing, alpha, beta) {
    const winner = checkWinner(board);
    if (winner === 'X') return -10 + depth;
    if (winner === 'O') return 10 - depth;
    if (board.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'O';
                const evalScore = minimax(board, depth + 1, false, alpha, beta);
                board[i] = null;
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'X';
                const evalScore = minimax(board, depth + 1, true, alpha, beta);
                board[i] = null;
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
        }
        return minEval;
    }
}

function getBestMove(board, difficulty) {
    switch (difficulty) {
        case 'easy':
            return randomMove(board);
        case 'medium':
            return Math.random() < 0.4 ? randomMove(board) : bestMoveImpossible(board);
        case 'hard':
            return Math.random() < 0.2 ? randomMove(board) : bestMoveImpossible(board);
        case 'impossible':
        default:
            return bestMoveImpossible(board);
    }
}

function bestMoveImpossible(board) {
    let bestVal = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'O';
            const moveVal = minimax(board, 0, false, -Infinity, Infinity);
            board[i] = null;
            if (moveVal > bestVal) {
                move = i;
                bestVal = moveVal;
            }
        }
    }
    return move;
}

function checkWinner(board) {
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8], // Rows
        [0,3,6],[1,4,7],[2,5,8], // Columns
        [0,4,8],[2,4,6] // Diagonals
    ];

    for (const [a,b,c] of winPatterns) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function createBoardEmbed(session) {
    const board = session.board
        .map(cell => cell === 'X' ? '❌' : cell === 'O' ? '⭕' : '⬜')
        .map((cell, i) => `[${cell}](${i + 1})`); // Make cells clickable (if using message components)

    return new EmbedBuilder()
        .setTitle('Tic-Tac-Toe')
        .setDescription(
            `**Turn**: ${session.turn}\n\n` +
            `${board.slice(0,3).join(' ')}\n` +
            `${board.slice(3,6).join(' ')}\n` +
            `${board.slice(6,9).join(' ')}`
        )
        .setColor(Colors.Blurple)
        .setFooter({ text: `Difficulty: ${session.difficulty} | Use @1-@9 to play` });
}

async function endGame(session, result) {
    const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTimestamp();

    switch (result) {
        case 'X':
            embed.setTitle('🎉 Player Wins!')
                .setDescription(`Congratulations ${session.player1}!`)
                .setColor(Colors.Green);
            break;
        case 'O':
            embed.setTitle('🤖 Bot Wins!')
                .setDescription('Better luck next time!')
                .setColor(Colors.Red);
            break;
        default:
            embed.setTitle('🏳 Draw!')
                .setDescription('The game ended in a tie');
    }

    await session.channel.send({ embeds: [embed] });
    activeGames.delete(session.channel.id);
}

client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    
    // Game commands
    if (content.startsWith('@tictactoe')) {
        const target = message.mentions.users.first();
        const channelId = message.channel.id;

        if (activeGames.has(channelId)) {
            return message.reply('There\'s already an active game in this channel!');
        }

        if (target) {
            if (target.bot) { // PvE Game
                const difficultyButtons = new ActionRowBuilder().addComponents(
                    ['easy', 'medium', 'hard', 'impossible'].map(level =>
                        new ButtonBuilder()
                            .setCustomId(`difficulty_${level}`)
                            .setLabel(level.toUpperCase())
                            .setStyle(ButtonStyle.Primary)
                    )
                );

                const msg = await message.reply({
                    content: `${message.author}, choose a difficulty level:`,
                    components: [difficultyButtons]
                });

                pendingInvites.set(msg.id, {
                    initiator: message.author,
                    channel: message.channel
                });

                setTimeout(() => {
                    if (pendingInvites.delete(msg.id)) {
                        msg.edit({ content: 'Difficulty selection timed out.', components: [] });
                    }
                }, 60000);

            } else { // PvP Game
                const inviteButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('accept')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('decline')
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                );

                const invite = await message.reply({
                    content: `${target}, you've been challenged to Tic-Tac-Toe by ${message.author}!`,
                    components: [inviteButtons]
                });

                pendingInvites.set(invite.id, {
                    player1: message.author,
                    player2: target,
                    channel: message.channel
                });

                setTimeout(() => {
                    if (pendingInvites.delete(invite.id)) {
                        invite.edit({ content: 'Invite expired.', components: [] });
                    }
                }, 60000);
            }
        } else {
            // Show rules
            const rulesEmbed = new EmbedBuilder()
                .setTitle('📜 Tic-Tac-Toe Rules')
                .setDescription([
                    '**How to play:**',
                    '1. Use `@tictactoe @user` to challenge another player',
                    '2. Use `@tictactoe @bot` to play against AI',
                    '3. Make moves by typing `@1`-`@9` corresponding to positions:',
                    '```\n1 2 3\n4 5 6\n7 8 9\n```',
                    '4. Use `@endtictac` to forfeit the game'
                ].join('\n'))
                .setColor(Colors.Blurple);

            message.reply({ embeds: [rulesEmbed] });
        }
    }

    // Handle moves
    if (/^@[1-9]$/i.test(content)) {
        const channelId = message.channel.id;
        const session = activeGames.get(channelId);
        
        if (!session || session.gameOver) return;
        if (message.author.id !== session.turn.id) {
            return message.reply({ content: 'It\'s not your turn!', ephemeral: true });
        }

        const position = parseInt(content.slice(1)) - 1;
        if (session.board[position] !== null) {
            return message.reply({ content: 'That position is already taken!', ephemeral: true });
        }

        // Make move
        session.board[position] = session.player1.id === message.author.id ? 'X' : 'O';
        let winner = checkWinner(session.board);

        if (winner) {
            session.gameOver = true;
            await endGame(session, winner);
        } else if (session.board.every(cell => cell !== null)) {
            session.gameOver = true;
            await endGame(session, null);
        } else {
            // Switch turns or process AI move
            if (session.mode === 'pve') {
                session.turn = session.player2;
                const aiMove = getBestMove(session.board, session.difficulty);
                session.board[aiMove] = 'O';
                
                winner = checkWinner(session.board);
                if (winner) {
                    session.gameOver = true;
                    await endGame(session, winner);
                } else if (session.board.every(cell => cell !== null)) {
                    session.gameOver = true;
                    await endGame(session, null);
                } else {
                    session.turn = session.player1;
                    await message.channel.send({ 
                        embeds: [createBoardEmbed(session)],
                        content: `${session.turn}, your turn!`
                    });
                }
            } else {
                session.turn = session.turn.id === session.player1.id ? session.player2 : session.player1;
                await message.channel.send({
                    embeds: [createBoardEmbed(session)],
                    content: `${session.turn}, your turn!`
                });
            }
        }
    }

    // End game command
    if (content === '@endtictac') {
        const channelId = message.channel.id;
        const session = activeGames.get(channelId);
        
        if (session && !session.gameOver) {
            if ([session.player1.id, session.player2?.id].includes(message.author.id)) {
                activeGames.delete(channelId);
                message.reply('Game ended by player request.');
            } else {
                message.reply('Only participants can end the game.');
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // Handle difficulty selection
    if (interaction.customId.startsWith('difficulty_')) {
        const difficulty = interaction.customId.split('_')[1];
        const invite = pendingInvites.get(interaction.message.id);

        if (!invite) {
            return interaction.update({ 
                content: 'Session expired. Please start a new game.', 
                components: [] 
            });
        }

        const session = {
            mode: 'pve',
            player1: invite.initiator,
            player2: interaction.client.user,
            turn: invite.initiator,
            board: Array(9).fill(null),
            difficulty: difficulty,
            gameOver: false,
            channel: invite.channel
        };

        activeGames.set(invite.channel.id, session);
        pendingInvites.delete(interaction.message.id);

        await interaction.update({
            content: `Game started! Difficulty: **${difficulty.toUpperCase()}**`,
            components: []
        });

        return invite.channel.send({
            content: `${session.player1}, your turn!`,
            embeds: [createBoardEmbed(session)]
        });
    }

    // Handle PvP invites
    if (['accept', 'decline'].includes(interaction.customId)) {
        const invite = pendingInvites.get(interaction.message.id);
        if (!invite) return interaction.update({ content: 'Invite expired.', components: [] });

        pendingInvites.delete(interaction.message.id);

        if (interaction.customId === 'decline') {
            return interaction.update({ 
                content: `${invite.player2} declined the challenge.`, 
                components: [] 
            });
        }

        const session = {
            mode: 'pvp',
            player1: invite.player1,
            player2: invite.player2,
            turn: invite.player1,
            board: Array(9).fill(null),
            gameOver: false,
            channel: invite.channel
        };

        activeGames.set(invite.channel.id, session);

        await interaction.update({
            content: `${invite.player1} vs ${invite.player2}! Game starting...`,
            components: []
        });

        return invite.channel.send({
            content: `${session.turn}, your turn!`,
            embeds: [createBoardEmbed(session)]
        });
    }
});

client.login('MTM1MDY0MjE0NjAyMTIxNjI1Nw.GxqzCT.lQI_37EoZyi0qAg77CSCiOyg3XG_1lSqAkwbzM');