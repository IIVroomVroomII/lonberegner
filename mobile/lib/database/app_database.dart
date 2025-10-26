import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/time_entry.dart';

class AppDatabase {
  static final AppDatabase instance = AppDatabase._init();
  static Database? _database;

  AppDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('lonberegning.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE time_entries (
        id TEXT PRIMARY KEY,
        employeeId TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT,
        endTime TEXT,
        workType TEXT,
        location TEXT,
        description TEXT,
        hoursWorked REAL,
        status TEXT,
        breaks TEXT,
        hasRestPeriod INTEGER,
        restHours REAL,
        latitude REAL,
        longitude REAL,
        synced INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entryId TEXT,
        action TEXT,
        data TEXT,
        createdAt TEXT
      )
    ''');
  }

  Future<void> insertTimeEntry(TimeEntry entry) async {
    final db = await database;
    await db.insert(
      'time_entries',
      {
        ...entry.toJson(),
        'breaks': entry.breaks.map((b) => b.toJson()).toList().toString(),
        'synced': 0,
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<TimeEntry>> getUnsyncedEntries() async {
    final db = await database;
    final maps = await db.query(
      'time_entries',
      where: 'synced = ?',
      whereArgs: [0],
    );

    return maps.map((map) => TimeEntry.fromJson(map as Map<String, dynamic>)).toList();
  }

  Future<void> markAsSynced(String entryId) async {
    final db = await database;
    await db.update(
      'time_entries',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [entryId],
    );
  }

  Future<List<TimeEntry>> getEntriesForDateRange(DateTime start, DateTime end) async {
    final db = await database;
    final maps = await db.query(
      'time_entries',
      where: 'date >= ? AND date <= ?',
      whereArgs: [start.toIso8601String().split('T')[0], end.toIso8601String().split('T')[0]],
      orderBy: 'date DESC',
    );

    return maps.map((map) => TimeEntry.fromJson(map as Map<String, dynamic>)).toList();
  }

  Future<void> close() async {
    final db = await database;
    await db.close();
  }
}
