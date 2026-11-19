import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

// Connect to a database file (created automatically)
export const sequalize = new Sequelize({
	dialect: "sqlite",
	storage: "listing-watch.sqlite",
	logging: false
});

// The TypeScript shape of one row
export class ListingModel extends Model<
	InferAttributes<ListingModel>,
	InferAttributes<ListingModel>
> {
	declare id: CreationOptional<number>;
	declare title: string;
	declare price: number;
	declare rating: number;
	declare inStock: boolean;
	declare url: string;
	declare status: CreationOptional<"ok" | "flagged" | "reviewed">;
	declare notes: CreationOptional<string | null>;
	declare flagReason: CreationOptional<string | null>
}

// The actual table columns
ListingModel.init(
	{
		id: { type: DataTypes.INTEGER, autoIncrement, primaryKey: true },
		title: { type: DataTypes.STRING, allowNull: false },
		price: { type: DataTypes.FLOAT, allowNull: false },
		rating: { type: DataTypes.INTEGER, allowNull: false },
		inStock: { type: DataTypes.BOOLEAN, allowNull: false },
		url: { type: DataTypes.STRING, allowNull: false, unique: true },
		status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ok" },
		notes: { type: DataTypes.TEXT, allowNull: true },
		flagReason: { type: DataTypes.TEXT, allowNull: true }
	},
	{ sequelize, tableName: "listings", timestamps: false }
);
