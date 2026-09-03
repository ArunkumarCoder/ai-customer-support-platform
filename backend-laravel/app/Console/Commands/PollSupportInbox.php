<?php

namespace App\Console\Commands;

use App\Jobs\AnalyzeSentimentJob;
use App\Jobs\SummarizeEmailJob;
use App\Models\Message;
use App\Models\Ticket;
use Illuminate\Console\Command;
use Webklex\IMAP\Facades\Client;

class PollSupportInbox extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:poll';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll the support inbox via IMAP and turn new emails into tickets';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $client = Client::account();
        $client->connect();

        $folder = $client->getFolder(config('imap.folder', 'INBOX'));
        $emails = $folder->query()->whereUnseen()->get();

        $this->info("Found {$emails->count()} unseen message(s).");

        foreach ($emails as $email) {
            try {
                $senderEmail = $email->getFrom()[0]->mail ?? 'unknown@unknown.invalid';
                $subject = (string) $email->getSubject();
                $body = trim($email->getTextBody());

                $ticket = Ticket::create([
                    'visitor_id' => $senderEmail,
                    'status' => 'open',
                    'priority' => 'normal',
                ]);

                $message = Message::create([
                    'ticket_id' => $ticket->id,
                    'sender' => 'customer',
                    'body' => "Subject: {$subject}\n\n{$body}",
                ]);

                SummarizeEmailJob::dispatch($ticket, $message);
                AnalyzeSentimentJob::dispatch($message);

                $email->setFlag('Seen');

                $this->info("Created ticket #{$ticket->id} from {$senderEmail}.");
            } catch (\Throwable $e) {
                $this->error('Failed to process an email, leaving it unseen for retry: ' . $e->getMessage());
            }
        }
    }
}
