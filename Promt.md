# PROJECT: OTTv2 – Oẳn Tù Tì chiến thuật trên bàn cờ 9x9

Bạn là một Senior Full-stack Game Developer. Hãy giúp tôi xây dựng một web game multiplayer có tên **Oẳn Tù Tì v2 (OTTv2)**.

Mục tiêu là tạo một game chiến thuật 2 người chơi, lấy ý tưởng từ Oẳn tù tì nhưng được triển khai dưới dạng board game trên bàn cờ 9x9. Game phải chạy được trên trình duyệt và hỗ trợ nhiều phòng/nhiều cặp người chơi đồng thời thông qua thư viện **playfull.html**.

---

## 1. MỤC TIÊU TỔNG QUÁT

Xây dựng một website cho phép:

* Người chơi tạo phòng.
* Người chơi tham gia phòng bằng mã phòng.
* Mỗi phòng có tối đa 2 người chơi.
* Nhiều phòng có thể tồn tại và chơi đồng thời.
* Trạng thái game được đồng bộ realtime giữa 2 người chơi.
* Server là nguồn dữ liệu đáng tin cậy cho trạng thái trận đấu.
* Client không được tự quyết định kết quả nước đi.
* Có hệ thống timer giống các board game đối kháng như cờ vua.
* Có trạng thái Waiting / Playing / Finished.
* Có thể chơi lại một trận sau khi kết thúc.
* Giao diện đơn giản, dễ hiểu, ưu tiên chức năng trước hiệu ứng.

---

# 2. BÀN CỜ

Sử dụng bàn cờ:

* Kích thước: 9x9.
* Tổng cộng 81 ô.
* Đánh tọa độ từ:

  a1 b1 c1 d1 e1 f1 g1 h1 i1
  a2 b2 ...
  ...
  a9 b9 c9 d9 e9 f9 g9 h9 i9

Quy ước:

* Góc dưới/trái: a1.
* Góc trên/phải: i9.
* Không có ô ngoài bàn cờ.
* Có thể sử dụng coordinate system nội bộ dạng row/column nhưng phải chuyển đổi chính xác sang tọa độ a1-i9.

---

# 3. QUÂN CỜ

OTTv2 sử dụng 3 loại quân tương ứng với Oẳn tù tì:

* ROCK – Đấm
* PAPER – Lá
* SCISSORS – Kéo

Quan hệ ăn quân:

```
ROCK thắng SCISSORS
SCISSORS thắng PAPER
PAPER thắng ROCK
```

Hai quân cùng loại:

```
ROCK không ăn được ROCK
PAPER không ăn được PAPER
SCISSORS không ăn được SCISSORS
```

Hai quân cùng loại chỉ có thể đứng chặn nhau.

---

# 4. SỐ LƯỢNG QUÂN

Hãy thiết kế một bộ quân mặc định cân bằng cho bàn cờ 9x9.

Đề xuất cấu hình mặc định:

Mỗi người chơi có:

* 5 ROCK
* 5 PAPER
* 5 SCISSORS

Tổng:

* 15 quân/người.
* 30 quân trên bàn cờ khi bắt đầu.

Không được đặt quân trùng ô.

Hãy thiết kế hệ thống cấu hình để sau này có thể thay đổi số lượng quân mà không cần sửa logic game.

Ví dụ:

```
piecesPerType = 5
```

Có thể mở rộng thành:

```
ROCK: 5
PAPER: 5
SCISSORS: 5
```

---

# 5. VỊ TRÍ KHỞI ĐẦU

Hai người chơi bắt đầu ở hai phía đối diện của bàn cờ.

Player 1 đặt quân trong vùng:

```
hàng 1–3
```

Player 2 đặt quân trong vùng:

```
hàng 7–9
```

Các vị trí khởi đầu phải:

* Không trùng nhau.
* Được tạo deterministic hoặc server-side.
* Đảm bảo hai bên có cùng số lượng quân.
* Không tạo lợi thế bất công rõ ràng cho một bên.

Ưu tiên tạo layout đối xứng.

Ví dụ:

Player 1:

```
3 hàng đầu
```

Player 2:

```
3 hàng cuối
```

Hãy tách starting position thành configuration để dễ thay đổi.

---

# 6. DI CHUYỂN QUÂN

Mỗi quân chỉ được di chuyển tối đa 1 ô trong một lượt.

Cho phép di chuyển theo 8 hướng:

```
↑
↖ ↑ ↗
←   →
↙ ↓ ↘
```

Tức là giống quân Vua trong cờ vua.

Một nước đi hợp lệ phải:

* Di chuyển đúng 1 ô.
* Không đi ra ngoài bàn cờ.
* Không được di chuyển tới ô đang chứa quân cùng phe.
* Có thể di chuyển tới ô trống.
* Có thể di chuyển tới ô chứa quân đối phương nếu quan hệ loại quân cho phép ăn.

Không cho phép:

* Di chuyển 2 ô.
* Di chuyển theo đường chéo quá 1 ô.
* Nhảy qua quân.
* Di chuyển ra ngoài bàn cờ.

---

# 7. LUẬT ĂN QUÂN

Khi quân A di chuyển vào ô chứa quân B của đối phương:

### Trường hợp 1 – A thắng B

Quân B bị loại khỏi bàn cờ.

Ví dụ:

```
ROCK -> SCISSORS
=> SCISSORS bị ăn.
```

### Trường hợp 2 – A thua B

Nước đi không hợp lệ.

Ví dụ:

```
ROCK -> PAPER
=> ROCK không được phép di chuyển vào ô PAPER.
```

### Trường hợp 3 – cùng loại

Không được ăn.

Ví dụ:

```
ROCK -> ROCK
=> nước đi không hợp lệ.
```

Hai quân cùng loại có thể đứng cạnh nhau và chặn đường nhau.

---

# 8. LUẬT QUAN TRỌNG: KHÔNG TỰ ĂN QUÂN

Một quân không được phép di chuyển vào ô của quân đối phương nếu loại quân đó khắc chế nó.

Ví dụ:

```
PAPER đang ở ô X
ROCK của đối phương ở ô Y
```

ROCK không được đi vào Y vì:

```
PAPER > ROCK
```

Server phải kiểm tra luật này.

Không được tin dữ liệu từ client.

---

# 9. ĐIỀU KIỆN THẮNG

Một người chơi thắng ngay lập tức khi xảy ra một trong các điều kiện:

## WIN CONDITION A – Ăn sạch một loại quân

Nếu Player A ăn hết toàn bộ một loại quân của Player B:

```
số ROCK của Player B = 0
```

hoặc:

```
số PAPER của Player B = 0
```

hoặc:

```
số SCISSORS của Player B = 0
```

=> Player A thắng.

Ví dụ:

Player B ban đầu:

```
ROCK = 5
PAPER = 5
SCISSORS = 5
```

Nếu Player A ăn hết 5 ROCK:

```
ROCK = 0
```

=> Player A thắng ngay.

---

## WIN CONDITION B – Đưa quân vào vùng đích

Các ô:

```
a1
i9
```

là các ô mục tiêu.

Quy định:

* Player 1 phải đưa một quân hợp lệ vào a1 để thắng.
* Player 2 phải đưa một quân hợp lệ vào i9 để thắng.

Server phải kiểm tra điều kiện này sau mỗi nước đi.

Nếu một nước đi vừa ăn quân vừa đạt điều kiện thắng thì trận đấu kết thúc ngay.

---

# 10. LƯỢT CHƠI

Game sử dụng turn-based system.

Ví dụ:

```
Player 1 -> Player 2 -> Player 1 -> Player 2...
```

Chỉ người đang có lượt mới được thực hiện nước đi.

Client không được tự ý thay đổi turn.

Server phải kiểm tra:

```
currentPlayer === requestingPlayer
```

Nếu không đúng:

```
reject move
```

---

# 11. TIMER

Hãy thiết kế timer tương tự các game board đối kháng.

Mặc định:

```
10 phút/người.
```

Có thể cấu hình:

* 3 phút
* 5 phút
* 10 phút
* 15 phút
* 30 phút

Mỗi người có một clock riêng.

Ví dụ:

```
Player 1: 09:42
Player 2: 10:00
```

Khi Player 1 đang đi:

```
Player 1 giảm thời gian.
Player 2 không giảm.
```

Khi Player 1 hoàn thành nước đi:

```
Clock của Player 1 dừng.
Clock của Player 2 bắt đầu.
```

Nếu timer của một người về 0:

```
người đó thua.
```

Timer phải được server-authoritative.

Không được chỉ dùng JavaScript client để quyết định timeout.

---

# 12. MOVE TIME / CHỐNG CÂU GIỜ

Ngoài tổng thời gian, có thể thiết kế tùy chọn:

```
maxMoveTime
```

Ví dụ:

```
30 giây/nước
```

Nếu người chơi không đi trong thời gian cho phép:

```
timeout
```

Tuy nhiên đây phải là setting có thể bật/tắt.

Mặc định:

```
total time = 10 phút
move time = OFF
```

---

# 13. DRAW / HÒA

Hãy thiết kế cơ chế hòa để tránh game vô hạn.

Các điều kiện hòa cơ bản:

### Threefold repetition

Nếu cùng một trạng thái bàn cờ xuất hiện 3 lần:

```
Draw
```

Trạng thái phải bao gồm ít nhất:

* vị trí quân
* loại quân
* người đang đi

### Fifty-move rule

Có thể áp dụng luật tương tự cờ vua:

Nếu có 50 lượt liên tiếp không có:

* ăn quân
* đưa quân vào mục tiêu

=> có thể hòa.

Nên triển khai thành setting:

```
enableDrawRules = true
```

---

# 14. STALEMATE

Nếu người chơi tới lượt nhưng:

* Không còn nước đi hợp lệ.

Hãy xác định kết quả theo cấu hình game.

Mặc định:

```
Stalemate = Draw
```

Không được để game bị kẹt vô hạn.

---

# 15. RANDOM / FAIRNESS

Server phải là nguồn random duy nhất nếu game cần random.

Không để client quyết định:

* vị trí quân ban đầu
* người thắng
* kết quả ăn quân
* timer
* turn

Nếu sử dụng random để tạo layout:

```
server-side RNG
```

Layout phải được tạo trước khi trận đấu bắt đầu và gửi cho cả hai client.

---

# 16. SERVER AUTHORITATIVE

Đây là yêu cầu rất quan trọng.

Client chỉ gửi:

```
playerId
gameId
pieceId
from
to
```

Server tự kiểm tra:

1. Game có tồn tại không?
2. Player có thuộc game không?
3. Game đang Playing không?
4. Có đúng lượt không?
5. Piece có thuộc player không?
6. Piece có thực sự ở from không?
7. from và to có hợp lệ không?
8. Khoảng cách có đúng 1 ô không?
9. Ô đích có quân cùng phe không?
10. Nếu có quân đối phương, loại quân có cho phép ăn không?
11. Nước đi có vi phạm luật không?
12. Có làm thay đổi điều kiện thắng không?
13. Timer còn thời gian không?

Chỉ khi tất cả hợp lệ:

```
apply move
```

Sau đó server broadcast state mới cho hai client.

---

# 17. MULTIPLAYER

Mỗi game có:

```
gameId
```

Ví dụ:

```
ROOM-AB12
```

Một room tối đa:

```
2 players
```

Trạng thái room:

```
WAITING
READY
PLAYING
FINISHED
```

Khi người thứ hai join:

```
WAITING -> READY
```

Sau khi cả hai sẵn sàng:

```
READY -> PLAYING
```

Khi có người thắng:

```
PLAYING -> FINISHED
```

---

# 18. RECONNECT

Nếu người chơi refresh browser hoặc mất kết nối:

* Không được mất trận đấu.
* Server vẫn giữ game state.
* Khi reconnect, client phải lấy lại state hiện tại.
* Timer phải tiếp tục đúng theo server.
* Không reset bàn cờ.

Nếu người chơi disconnect quá một khoảng thời gian cấu hình:

```
60 giây
```

có thể coi là resignation/forfeit.

Setting:

```
disconnectGracePeriod = 60 seconds
```

---

# 19. RESIGN

Cho phép người chơi chủ động đầu hàng.

Nút:

```
RESIGN
```

Khi xác nhận:

```
người chơi thua ngay.
```

Server ghi:

```
result = RESIGNATION
```

---

# 20. GAME SETTINGS

Tạo một GameSettings object/configuration.

Ví dụ:

```
boardSize = 9

piecesPerType = 5

playerTime = 600

moveTime = null

enableThreefoldRepetition = true

enableFiftyMoveRule = true

disconnectGracePeriod = 60

allowResign = true

allowRematch = true
```

Các setting này phải được thiết kế để dễ thay đổi.

---

# 21. UI

Trang web tối thiểu gồm:

## HOME

* Create Game
* Join Game
* Game Rules

## CREATE GAME

Cho phép chọn:

* Time control
* Số quân mỗi loại
* Draw rules
* Move timer nếu có

Nút:

```
Create Room
```

Sau khi tạo:

```
Room Code: ABC123
```

## JOIN GAME

Nhập:

```
Room Code
```

Nút:

```
Join
```

## GAME SCREEN

Hiển thị:

* Bàn cờ 9x9.
* Quân cờ.
* Player names.
* Timer của hai người.
* Turn indicator.
* Số quân còn lại của từng loại.
* Move history.
* Resign button.
* Connection status.

Ví dụ:

```
Player 1
09:32

ROCK: 4
PAPER: 5
SCISSORS: 3

[ BOARD ]

ROCK: 5
PAPER: 4
SCISSORS: 5

Player 2
08:54
```

---

# 22. UX

Khi chọn một quân:

* Highlight quân đang chọn.
* Highlight các ô có thể đi.
* Hiển thị rõ ô mục tiêu.
* Không cho click vào nước đi không hợp lệ.

Khi ăn quân:

* Hiển thị animation đơn giản.
* Cập nhật counter.

Khi thắng:

Hiển thị:

```
PLAYER 1 WINS
```

và lý do:

```
"Eliminated all ROCK pieces"
```

hoặc:

```
"Reached target a1"
```

---

# 23. PLAYFULL.HTML

Sử dụng thư viện:

```
playfull.html
```

để hỗ trợ môi trường server/multiplayer theo yêu cầu của project.

Trước khi triển khai, hãy kiểm tra chính xác API và cách sử dụng của playfull.html thay vì tự giả định API.

Tách game logic khỏi lớp networking.

Kiến trúc mong muốn:

```
Game Rules
    ↓
Game Engine
    ↓
Server / Multiplayer
    ↓
Client UI
```

Game Engine không được phụ thuộc trực tiếp vào DOM.

---

# 24. GAME ENGINE

Hãy tạo một module/class độc lập, ví dụ:

```
GameEngine
```

Nó chịu trách nhiệm:

* validateMove()
* makeMove()
* capturePiece()
* switchTurn()
* checkWinCondition()
* checkDrawCondition()
* checkTimeout()
* resign()
* getLegalMoves()
* serializeState()

Ví dụ API:

```
game.validateMove(move)

game.makeMove(move)

game.getLegalMoves(pieceId)

game.getState()

game.isGameOver()
```

Game Engine phải có thể test độc lập mà không cần browser.

---

# 25. DATA MODEL

Thiết kế model tương tự:

```
Game
Player
Piece
Move
GameSettings
GameResult
```

Ví dụ:

Game:

```
id
status
currentPlayer
board
players
settings
createdAt
startedAt
finishedAt
result
```

Piece:

```
id
playerId
type
position
alive
```

Move:

```
moveNumber
playerId
pieceId
from
to
capturedPieceId
timestamp
```

---

# 26. ANTI-CHEAT CƠ BẢN

Không tin client.

Client chỉ được gửi request:

```
"Tôi muốn di chuyển piece X từ A đến B."
```

Server quyết định:

```
hợp lệ / không hợp lệ
```

Không cho client gửi:

```
capturedPiece
winner
nextTurn
remainingTime
```

Các thông tin đó phải do server tính.

---

# 27. VALIDATION

Viết test cho toàn bộ luật quan trọng.

Ít nhất phải có test:

1. ROCK ăn SCISSORS.
2. SCISSORS ăn PAPER.
3. PAPER ăn ROCK.
4. ROCK không ăn ROCK.
5. PAPER không ăn PAPER.
6. SCISSORS không ăn SCISSORS.
7. ROCK không được ăn PAPER.
8. Piece chỉ đi 1 ô.
9. Không đi ra ngoài board.
10. Không đi vào quân cùng phe.
11. Chỉ đúng player mới được đi.
12. Không được đi khi game đã kết thúc.
13. Ăn hết một loại quân => thắng.
14. Đưa quân vào a1 => Player 1 thắng.
15. Đưa quân vào i9 => Player 2 thắng.
16. Timeout => thua.
17. Resign => thua.
18. Threefold repetition => hòa nếu bật.
19. Stalemate => hòa.
20. Reconnect không làm mất state.

---

# 28. FAIRNESS / CÂN BẰNG

Không tự ý thêm các cơ chế làm thay đổi luật cốt lõi.

Ưu tiên:

* Hai bên có cùng số lượng quân.
* Starting position đối xứng.
* Cùng thời gian.
* Cùng khả năng di chuyển.
* Không có random advantage sau khi game bắt đầu.
* Server xử lý luật giống nhau cho cả hai bên.
* Không ưu tiên player nào về timer.
* Không có hidden information nếu chưa thiết kế rõ ràng.

Nếu phát hiện một luật có khả năng tạo lợi thế lớn cho một bên, hãy chỉ ra vấn đề và đề xuất phương án cân bằng nhưng KHÔNG tự ý thay đổi luật mà không giải thích.

---

# 29. LOGGING

Server nên log:

* Game created.
* Player joined.
* Game started.
* Move accepted.
* Move rejected.
* Capture.
* Timeout.
* Resign.
* Disconnect.
* Reconnect.
* Game finished.

Không log thông tin nhạy cảm không cần thiết.

---

# 30. CODE QUALITY

Yêu cầu:

* Clean code.
* Modular architecture.
* Không viết toàn bộ game trong một file.
* Constants/configuration tách riêng.
* Game rules tách khỏi UI.
* Server validation tách khỏi rendering.
* Có comments ở các phần luật phức tạp.
* Không duplicate logic giữa client và server nếu có thể tránh.
* Ưu tiên TypeScript nếu phù hợp.
* Code dễ mở rộng.

---

# 31. DEVELOPMENT PLAN

Đừng viết toàn bộ project một lần.

Hãy triển khai theo các phase:

### Phase 1

Tạo board 9x9 và render quân.

### Phase 2

Implement GameEngine offline.

### Phase 3

Implement movement.

### Phase 4

Implement ROCK/PAPER/SCISSORS capture rules.

### Phase 5

Implement win conditions.

### Phase 6

Implement timer.

### Phase 7

Implement room/multiplayer bằng playfull.html.

### Phase 8

Implement reconnect/resign/draw.

### Phase 9

Implement UI/UX.

### Phase 10

Implement automated tests.

### Phase 11

Playtest và kiểm tra fairness.

---

# 32. QUY TẮC KHI AGENT LẬP TRÌNH

Trước mỗi phase:

1. Giải thích ngắn gọn mục tiêu.
2. Xác định file cần tạo/sửa.
3. Viết code.
4. Giải thích cách chạy.
5. Viết test tương ứng.
6. Kiểm tra các edge cases.
7. Không phá vỡ chức năng đã hoàn thành ở phase trước.

Nếu phát hiện yêu cầu mâu thuẫn hoặc luật chưa rõ:

* Không tự ý quyết định một cách âm thầm.
* Nêu rõ vấn đề.
* Đưa ra 2–3 phương án.
* Chọn phương án mặc định hợp lý chỉ khi cần tiếp tục triển khai.

---

# 33. ĐIỂM CẦN ƯU TIÊN

Thứ tự ưu tiên:

1. Đúng luật.
2. Multiplayer ổn định.
3. Server authoritative.
4. Không thể gian lận đơn giản bằng client.
5. Timer chính xác.
6. Không mất game state khi reconnect.
7. UI dễ sử dụng.
8. Animation và visual effects.

Không hy sinh tính chính xác của Game Engine để đổi lấy animation hoặc giao diện đẹp.

---

# 34. OUTPUT MONG MUỐN

Hãy bắt đầu bằng:

1. Phân tích yêu cầu.
2. Chỉ ra những luật đã được xác định.
3. Chỉ ra những luật cần quyết định thêm.
4. Đề xuất architecture.
5. Đề xuất folder structure.
6. Thiết kế data model.
7. Thiết kế GameState.
8. Thiết kế GameEngine API.
9. Sau đó bắt đầu Phase 1.

Không tạo code multiplayer trước khi GameEngine offline có logic luật cơ bản và test.

Mục tiêu cuối cùng là một web game OTTv2 hoàn chỉnh, có thể chạy được, 2 người chơi realtime trong một room và nhiều room hoạt động đồng thời.
