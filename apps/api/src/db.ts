import {
	Sequelize,
	DataTypes,
	Model,
	type InferAttributes,
	type InferCreationAttributes,
	type CreationOptional
} from "sequelize";
import type { ListingStatus } from "@listing-watch/shared";

// Connect to a database file (created automatically).
// DB_PATH lets tests use ":memory:" so they never touch the real file.
export const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: process.env.DB_PATH ?? "listing-watch.sqlite",
	logging: false
});

// The TypeScript shape of one row
export class ListingModel extends Model<
	InferAttributes<ListingModel>,
	InferCreationAttributes<ListingModel>
> {
	declare id: CreationOptional<number>;
	declare title: string;
	declare price: number;
	declare rating: number;
	declare inStock: boolean;
	declare url: string;
	declare status: CreationOptional<ListingStatus>;
	declare flagReasons: CreationOptional<string[]>;
	declare notes: CreationOptional<string | null>;
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
}

// The actual table columns
ListingModel.init(
	{
		id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
		title: { type: DataTypes.STRING, allowNull: false },
		price: { type: DataTypes.FLOAT, allowNull: false },
		rating: { type: DataTypes.INTEGER, allowNull: false },
		inStock: { type: DataTypes.BOOLEAN, allowNull: false },
		url: { type: DataTypes.STRING, allowNull: false, unique: true },
		status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ok" },
		// SQLite has no array type; Sequelize stores JSON as text and parses it back
		flagReasons: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
		// defaultValue null so a freshly created row includes `notes: null` in its JSON
		notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
		createdAt: DataTypes.DATE,
		updatedAt: DataTypes.DATE
	},
	{ sequelize, tableName: "listings", timestamps: true }
);
