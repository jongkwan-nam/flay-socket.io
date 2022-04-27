const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
	mode: 'development',
	entry: {
		client: './src/client.js',
	},
	devtool: 'source-map',
	output: {
		// filename: '[name].[contenthash].js',
		filename: '[name].js',
		path: path.resolve(__dirname, './public/dist'),
		clean: true,
	},
	plugins: [new MiniCssExtractPlugin()],
	module: {
		rules: [
			{
				test: /\.(scss)$/,
				use: [{
					loader: MiniCssExtractPlugin.loader
				}, {
					loader: 'css-loader'
				}, {
					loader: 'postcss-loader',
					options: {
						// `postcssOptions` is needed for postcss 8.x;
						// if you use postcss 7.x skip the key
						postcssOptions: {
							// postcss plugins, can be exported to postcss.config.js
							plugins: function () {
								return [
									require('autoprefixer')
								];
							}
						}
					}
				}, {
					loader: 'sass-loader'
				}]
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: 'asset/resource',
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: 'asset/resource',
			},
		]
	},
	optimization: {
		moduleIds: 'deterministic',
		runtimeChunk: 'single',
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					chunks: 'all',
				},
			},
		},
	},
};
