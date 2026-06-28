# The TCP/IP model

## Today we are learning
- name the four layers of the TCP/IP model in order
- say what each layer does
- match protocols to their layer
- explain the difference between TCP and UDP

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: TCP/IP model · application layer · transport layer · internet layer · link layer · TCP · UDP. Hand out both worksheets.

## Starter — quick questions
What is a protocol? Which protocol requests a web page?

> 🧑‍🏫 Answers: a protocol is a set of rules; HTTP requests a web page. Recap: SMTP sends email.

## The four layers  (I do)
Data is prepared in four layers. From the top down:
- Application — the app prepares the data
- Transport — splits into segments, adds port numbers
- Internet — adds IP addresses (makes packets)
- Link — sends the bits to the next device

![The four-layer TCP/IP stack]({{res:l10-tcpip-layer-stack.png}})

> 🧑‍🏫 Walk down the stack once. Plain line: each layer adds its own bit, like putting a letter inside more and more envelopes. The class labels the stack on the worksheet.

## Sending a web page  (we do)
The browser (application) writes the request → transport adds ports → internet adds IP addresses → link sends it out. At the other end it is unpacked in reverse.

> 🧑‍🏫 Optional unplugged demo: pass an envelope through four pupils, each adding a label. Keep it calm and slow.

## TCP or UDP?  (you do)
Both work in the transport layer.
- TCP = reliable: checks every packet arrives, asks again for missing ones (web pages, emails).
- UDP = unreliable: does not resend lost packets (fast video and voice calls).

> 🧑‍🏫 Likely error: thinking UDP is "broken". Fix-words: "UDP trades a few lost bits for speed." Pairs do the fill-in-the-blank and the sort.

## I can…
Tick your four "I can…". Tell me what the link layer does.

> 🧑‍🏫 Note who can name all four layers in order.
